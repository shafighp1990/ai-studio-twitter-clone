import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { writeFileSync } from "node:fs";
const base = process.env.TEST_URL || "http://localhost:3000";
const run = randomUUID().replaceAll("-", "").slice(0, 10),
  password = randomBytes(24).toString("base64url");
const cleanup = { users: [], rooms: [] };
const client = () => ({
  cookies: new Map(),
  async call(path, value, expected = 200, origin = base, method) {
    const r = await fetch(base + path, {
      method: method || (value === undefined ? "GET" : "POST"),
      headers: {
        origin,
        "Content-Type": "application/json",
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: value === undefined ? undefined : JSON.stringify(value),
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    for (const raw of r.headers.getSetCookie()) {
      const [name, ...parts] = raw.split(";")[0].split("=");
      this.cookies.set(name, parts.join("="));
    }
    const body = await r.json();
    assert.equal(r.status, expected, path + ": " + JSON.stringify(body.error));
    return body;
  },
});
const owner = client(),
  other = client(),
  guest = client(),
  outsider = client();
try {
  for (const [i, c] of [owner, other].entries()) {
    await c.call("/api/auth/register", {
      email: `cf_${run}_${i}@example.invalid`,
      password,
      options: {
        data: { username: `cf_${run}_${i}`, name: "Migration test " + i },
      },
    });
    const { data } = await c.call("/api/auth/session");
    cleanup.users.push(data.user.id);
  }
  await outsider.call("/api/meetings", { title: "Forbidden" }, 401);
  await owner.call(
    "/api/meetings",
    { title: "CSRF" },
    403,
    "https://evil.invalid",
  );
  const room = await owner.call(
    "/api/meetings",
    { title: "Cloudflare validation" },
    201,
  );
  cleanup.rooms.push(room.id);
  const path = "/api/meetings/" + room.id,
    invite = new URL(room.inviteUrl).hash.slice(1);
  await guest.call(
    path,
    { action: "join", name: "Guest", invite: "wrong" },
    403,
  );
  await guest.call(path + "?state=1", undefined, 401);
  const host = await owner.call(path, { action: "join", name: "Host" });
  const g = await guest.call(path, { action: "join", name: "Guest", invite });
  assert.ok(
    g.iceServers.some((x) => x.urls.some((u) => u.startsWith("turn:"))),
  );
  assert.equal(g.isHost, false);
  assert.equal(host.isHost, true);
  await guest.call("/api/meetings", { title: "Forbidden" }, 401);
  await guest.call(path, { action: "end" }, 401);
  await other.call(path, { action: "rotate" }, 403);
  await guest.call(path, {
    action: "signal",
    to: host.participantId,
    payload: { type: "candidate", candidate: { candidate: "test" } },
  });
  const state = await owner.call(path + "?state=1");
  assert.equal(state.peers.length, 2);
  assert.equal(state.signals[0].sender, g.participantId);
  await guest.call(
    path,
    {
      action: "signal",
      to: randomUUID(),
      payload: { type: "offer", sdp: "test" },
    },
    404,
  );
  const rotated = await owner.call(path, { action: "rotate" });
  await outsider.call(
    path,
    { action: "join", name: "Old invite", invite },
    403,
  );
  await outsider.call(path, {
    action: "join",
    name: "New invite",
    invite: new URL(rotated.inviteUrl).hash.slice(1),
  });
  await outsider.call(path, { action: "leave" });
  await outsider.call(path + "?state=1", undefined, 401);
  const post = await owner.call("/api/social", {
    table: "posts",
    op: "insert",
    values: {
      author_id: cleanup.users[1],
      content: "Cloudflare migration test",
    },
  });
  await other.call(
    "/api/social",
    { table: "posts", op: "delete", filters: { id: post.data.id } },
    404,
  );
  await other.call(
    "/api/social",
    {
      table: "profiles",
      op: "update",
      filters: { id: cleanup.users[0] },
      values: {},
    },
    403,
  );
  await owner.call("/api/social", {
    table: "posts",
    op: "delete",
    filters: { id: post.data.id },
  });
  await owner.call(path, { action: "end" });
  await guest.call(path + "?state=1", undefined, 410);
  await guest.call(path, { action: "join", name: "Guest", invite }, 410);
  const imagePath = '/api/media/' + cleanup.users[0] + '/test-' + run + '.png';
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const upload = await fetch(base + imagePath, {method:'PUT',headers:{origin:base,'Content-Type':'image/png',cookie:[...owner.cookies].map(([k,v])=>k+'='+v).join('; ')},body:png});
  assert.equal(upload.status,200);
  const download = await fetch(base + imagePath);
  assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),png);
  await other.call('/api/media/delete',{paths:[imagePath.slice('/api/media/'.length)]},403);
  await owner.call('/api/media/delete',{paths:[imagePath.slice('/api/media/'.length)]});
  assert.equal((await fetch(base+imagePath,{cache:'no-store'})).status,404);
  const enrollment = await owner.call("/api/auth/enroll", {});
  assert.match(enrollment.data.totp.qr_code, /^data:image\/png;base64,/);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0,
    v = 0,
    decoded = [];
  for (const x of enrollment.data.totp.secret) {
    v = (v << 5) | alphabet.indexOf(x);
    bits += 5;
    if (bits >= 8) {
      decoded.push((v >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  function code(step) {
    const b = Buffer.alloc(8);
    b.writeBigUInt64BE(BigInt(step));
    const mac = createHmac("sha1", Buffer.from(decoded)).update(b).digest(),
      o = mac[19] & 15;
    return String((mac.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(
      6,
      "0",
    );
  }
  const step = Math.floor(Date.now() / 30000),
    factorId = enrollment.data.id;
  await owner.call("/api/auth/verify", { factorId, code: code(step) });
  await owner.call("/api/auth/logout", {});
  await owner.call("/api/auth/login", {
    email: `cf_${run}_0@example.invalid`,
    password,
  });
  await owner.call("/api/meetings", { title: "MFA blocked" }, 401);
  await owner.call("/api/auth/verify", { factorId, code: code(step) }, 400);
  await owner.call("/api/auth/verify", { factorId, code: code(step + 1) });
  await owner.call("/api/auth/unenroll", { factorId });
  await owner.call("/api/meetings");
  console.log(
    "PASS: signup/login, CSRF, guest invites, rotation, room ownership, signaling, end/revocation, social ownership, R2 upload/delete ownership, MFA/replay protection.",
  );
} finally {
  if (process.env.TEST_CLEANUP_FILE)
    writeFileSync(process.env.TEST_CLEANUP_FILE, JSON.stringify(cleanup), {
      mode: 0o600,
    });
}
