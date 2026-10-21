import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
// This destructive suite is hard-coded to local storage and disposable accounts.
const base = "http://localhost:3000";
if (process.env.TEST_REMOTE_D1 || process.env.TEST_URL)
  throw new Error("Remote targets are prohibited in this local admin test");
const run = randomBytes(5).toString("hex"),
  password = randomBytes(24).toString("base64url");
const cleanup = { users: [], rooms: [], admin: null, media: [] };
function sql(command) {
  const result = execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--command",
      command,
      "--json",
    ],
    {
      env: { ...process.env, WRANGLER_LOG_PATH: "/tmp/arr-admin-test-d1.log" },
      encoding: "utf8",
    },
  );
  assert.ok(JSON.parse(result).every((x) => x.success));
}
const client = () => ({
  cookies: new Map(),
  async call(path, value, status = 200, origin = base) {
    const r = await fetch(base + path, {
      method: value === undefined ? "GET" : "POST",
      headers: {
        connection: "close",
        origin,
        "Content-Type": "application/json",
        cookie: [...this.cookies].map(([k, v]) => k + "=" + v).join("; "),
      },
      body: value === undefined ? undefined : JSON.stringify(value),
      redirect: "manual",
      signal: AbortSignal.timeout(120000),
    });
    for (const raw of r.headers.getSetCookie()) {
      const [name, ...parts] = raw.split(";")[0].split("=");
      this.cookies.set(name, parts.join("="));
    }
    const j = await r.json();
    assert.equal(r.status, status, path + ": " + JSON.stringify(j.error));
    return j;
  },
});
const admin = client(),
  user = client(),
  outside = client(),
  old = client();
let userPassword = password;
const email = (i) => `adm_${run}_${i}@example.invalid`;
const login = () =>
  user.call("/api/auth/login", { email: email(1), password: userPassword });
try {
  await outside.call("/api/admin", undefined, 401);
  for (const [i, c] of [admin, user].entries()) {
    await c.call("/api/auth/register", {
      email: email(i),
      password,
      is_admin: 1,
      options: {
        data: {
          username: `adm_${run}_${i}`,
          name: "Admin validation " + i,
          is_admin: 1,
        },
      },
    });
    cleanup.users.push((await c.call("/api/auth/session")).data.user.id);
    await c.call("/api/admin", undefined, 403);
  }
  const [aid, uid] = cleanup.users;
  cleanup.admin = aid;
  sql(`UPDATE users SET is_admin=1 WHERE id='${aid}' AND email='${email(0)}'`);
  const overview = await admin.call("/api/admin");
  assert.ok(overview.counts.users >= 2);
  for (const section of overview.tables) {
    const result = await admin.call("/api/admin?section=" + section);
    assert.ok(Array.isArray(result.rows));
    assert.doesNotMatch(
      JSON.stringify(result),
      /password_hash|token_hash|invite_hash|"secret"/,
    );
    await user.call("/api/admin?section=" + section, undefined, 403);
  }
  assert.equal(
    (
      await admin.call(
        "/api/admin?section=users&q=" + encodeURIComponent("' OR 1=1 --"),
      )
    ).total,
    0,
  );
  await admin.call("/api/admin?section=sqlite_master", undefined, 404);
  await admin.call(
    "/api/admin",
    { action: "disable_user", id: uid },
    403,
    "https://evil.invalid",
  );
  await user.call("/api/admin", { action: "reset_password", id: aid }, 403);
  await admin.call("/api/admin", { action: "disable_user", id: aid }, 403);
  await admin.call("/api/admin", { action: "reset_password", id: aid }, 403);
  await user.call("/api/social", {
    table: "profiles",
    op: "update",
    filters: { id: uid },
    values: {
      name: "Admin validation 1",
      bio: "",
      location: "",
      website: "",
      is_admin: 1,
    },
  });
  await user.call("/api/admin", undefined, 403);
  const key = uid + "/admin-test-" + run + ".png";
  cleanup.media.push(key);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = () =>
    fetch(base + "/api/media/" + key, {
      method: "PUT",
      headers: {
        origin: base,
        "Content-Type": "image/png",
        cookie: [...user.cookies].map(([k, v]) => k + "=" + v).join("; "),
      },
      body: png,
    });
  assert.equal((await upload()).status, 200);
  await user.call("/api/social", {
    table: "profiles",
    op: "update",
    filters: { id: uid },
    values: {
      name: "Admin validation 1",
      bio: "",
      location: "",
      website: "",
      avatar_url: "/api/media/" + key,
    },
  });
  const p = (
    await user.call("/api/social", {
      table: "posts",
      op: "insert",
      values: { content: "Admin test " + run, image_url: "/api/media/" + key },
    })
  ).data;
  await user.call("/api/social", {
    table: "posts",
    op: "insert",
    values: { content: "Admin test reply " + run, reply_to_id: p.id },
  });
  await admin.call("/api/admin", { action: "remove_image", key });
  assert.equal((await fetch(base + "/api/media/" + key)).status, 404);
  assert.equal((await upload()).status, 403);
  assert.equal(
    (await admin.call("/api/admin?section=users&q=" + uid)).rows[0].avatar_url,
    null,
  );
  assert.equal(
    (await admin.call("/api/admin?section=posts&q=" + p.id)).rows[0].image_url,
    null,
  );
  await admin.call("/api/admin", { action: "delete_post", id: p.id });
  assert.equal(
    (await admin.call("/api/admin?section=posts&q=" + run)).total,
    0,
  );
  const room = await user.call(
    "/api/meetings",
    { title: "Admin test room" },
    201,
  );
  cleanup.rooms.push(room.id);
  await admin.call("/api/admin", { action: "end_room", id: room.id });
  await outside.call(
    "/api/meetings/" + room.id,
    {
      action: "join",
      name: "Guest",
      invite: new URL(room.inviteUrl).hash.slice(1),
    },
    410,
  );
  await admin.call("/api/admin", { action: "revoke_sessions", id: uid });
  await user.call("/api/meetings", undefined, 401);
  await login();
  old.cookies = new Map(user.cookies);
  const reset = await admin.call("/api/admin", {
    action: "reset_password",
    id: uid,
  });
  assert.equal(reset.temporaryPassword.length, 24);
  await old.call("/api/meetings", undefined, 401);
  await user.call("/api/auth/login", { email: email(1), password }, 401);
  userPassword = reset.temporaryPassword;
  await login();
  assert.equal(
    (await user.call("/api/auth/assurance")).data.mustChangePassword,
    true,
  );
  await user.call("/api/meetings", undefined, 401);
  await user.call(
    "/api/auth/change-password",
    { currentPassword: userPassword, newPassword: "tiny" },
    400,
  );
  const next = randomBytes(24).toString("base64url");
  await user.call(
    "/api/auth/change-password",
    { currentPassword: "incorrect-password", newPassword: next },
    403,
  );
  await user.call("/api/auth/change-password", {
    currentPassword: userPassword,
    newPassword: next,
  });
  assert.equal(
    (await user.call("/api/auth/assurance")).data.mustChangePassword,
    false,
  );
  await user.call("/api/meetings");
  await outside.call(
    "/api/auth/login",
    { email: email(1), password: userPassword },
    401,
  );
  userPassword = next;
  await admin.call("/api/admin", { action: "disable_user", id: uid });
  await user.call("/api/meetings", undefined, 401);
  await user.call(
    "/api/auth/login",
    { email: email(1), password: userPassword },
    401,
  );
  await admin.call("/api/admin", { action: "enable_user", id: uid });
  await login();
  const audit = await admin.call("/api/admin?section=admin_audit");
  for (const secret of [password, userPassword, reset.temporaryPassword])
    assert.ok(!JSON.stringify(audit).includes(secret));
  assert.ok(audit.rows.some((x) => x.action === "reset_password"));
  console.log(
    "PASS: admin authorization, role escalation protection, safe table browsing, CSRF, post/reply deletion, R2 removal/tombstone, room moderation, session revocation, temporary reset/forced change, suspension and audit redaction.",
  );
} finally {
  // Exact IDs from this run only. Foreign-key dependants are removed first.
  for (const key of cleanup.media) {
    try {
      await admin.call("/api/admin", { action: "remove_image", key });
    } catch {
      /* Local orphan can be removed with wrangler after failure. */
    }
  }
  for (const id of cleanup.users) {
    assert.match(id, /^[a-f0-9-]{36}$/);
    sql(
      `DELETE FROM rooms WHERE host_id='${id}'; DELETE FROM participants WHERE user_id='${id}'; DELETE FROM removed_media WHERE removed_by='${id}'; DELETE FROM admin_audit WHERE actor_id='${id}'; DELETE FROM users WHERE id='${id}' AND email LIKE 'adm_${run}_%@example.invalid'`,
    );
  }
  writeFileSync(
    "/tmp/arr-admin-local-result.json",
    JSON.stringify({ cleaned: true, run }),
    { mode: 0o600 },
  );
}
