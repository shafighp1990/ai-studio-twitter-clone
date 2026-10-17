"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { meetingMessages } from "@/lib/meeting-i18n";
import { useI18n } from "./I18nProvider";
import LanguageSwitcher from "./LanguageSwitcher";
type PeerInfo = { id: string; name: string; isHost: number };
type Connection = {
  pc: RTCPeerConnection;
  stream: MediaStream;
  candidates: RTCIceCandidateInit[];
  restarts: number;
};
type Signal = {
  type: "offer" | "answer" | "candidate";
  sdp?: string;
  candidate?: RTCIceCandidateInit;
};
type MeetingResponse = {
  participantId: string;
  iceServers: RTCIceServer[];
  inviteUrl: string;
  error?: { message: string };
  peers: PeerInfo[];
  signals: { id: number; sender: string; payload: Signal }[];
};
function VideoTile({
  stream,
  name,
  muted = false,
  status,
}: {
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  status?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => {});
    }
  }, [stream]);
  return (
    <section className="relative min-h-52 overflow-hidden rounded-2xl border border-[#293036] bg-[#151e24]">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        controls={!muted}
        className="aspect-video h-full max-h-[65vh] w-full object-contain"
      />
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/90 to-transparent p-4">
        <span className="font-semibold" dir="auto">
          {name}
        </span>
        <span className="text-xs text-[#9cc7dd]">{status}</span>
      </div>
    </section>
  );
}
export default function MeetingRoom({
  room,
  host,
  initialName,
}: {
  room: { id: string; title: string; ended: boolean };
  host: boolean;
  initialName: string;
}) {
  const { locale } = useI18n(),
    m = meetingMessages[locale];
  const [name, setName] = useState(initialName),
    [joined, setJoined] = useState(false),
    [busy, setBusy] = useState(false),
    [ended, setEnded] = useState(room.ended),
    [error, setError] = useState(""),
    [local, setLocal] = useState<MediaStream | null>(null),
    [peers, setPeers] = useState<PeerInfo[]>([]),
    [streams, setStreams] = useState<Record<string, MediaStream>>({}),
    [statuses, setStatuses] = useState<Record<string, string>>({}),
    [mic, setMic] = useState(true),
    [camera, setCamera] = useState(true),
    [sharing, setSharing] = useState(false),
    [invite, setInvite] = useState(""),
    [copied, setCopied] = useState(false),
    [elapsed, setElapsed] = useState(0);
  const connections = useRef(new Map<string, Connection>()),
    localStream = useRef<MediaStream | null>(null),
    displayStream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    active = useRef(false),
    myId = useRef(""),
    ice = useRef<RTCIceServer[]>([]),
    cursor = useRef(0),
    inviteSecret = useRef(""),
    start = useRef(0),
    elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null),
    signalChain = useRef(Promise.resolve());
  const endpoint = "/api/meetings/" + room.id;
  useEffect(() => {
    const peersToClose = connections.current;
    const secret =
      location.hash.slice(1) ||
      sessionStorage.getItem("meeting-invite:" + room.id) ||
      "";
    inviteSecret.current = secret;
    if (secret) {
      sessionStorage.setItem("meeting-invite:" + room.id, secret);
      history.replaceState(null, "", location.pathname);
    }
    return () => {
      active.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
      for (const c of peersToClose.values()) c.pc.close();
      localStream.current?.getTracks().forEach((t) => t.stop());
      displayStream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [room.id]);
  async function api(value: unknown) {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await r.json()) as MeetingResponse;
    if (!r.ok) throw new Error(data.error?.message ?? m.error);
    return data;
  }
  function send(to: string, payload: Signal) {
    signalChain.current = signalChain.current
      .then(async () => {
        if (active.current) await api({ action: "signal", to, payload });
      })
      .catch(() => {
        if (active.current) setError(m.reconnecting);
      });
    return signalChain.current;
  }
  function makePeer(id: string) {
    const found = connections.current.get(id);
    if (found) return found;
    const pc = new RTCPeerConnection({ iceServers: ice.current }),
      stream = new MediaStream();
    const c: Connection = { pc, stream, candidates: [], restarts: 0 };
    connections.current.set(id, c);
    for (const kind of ["audio", "video"] as const) {
      const track =
        (kind === "video"
          ? displayStream.current
          : null
        )?.getVideoTracks()[0] ??
        localStream.current?.getTracks().find((t) => t.kind === kind);
      const transceiver = pc.addTransceiver(track ?? kind, {
        direction: "sendrecv",
        streams: localStream.current ? [localStream.current] : [],
        sendEncodings:
          kind === "video"
            ? [{ maxBitrate: 2000000, maxFramerate: 30 }]
            : undefined,
      });
      void transceiver;
    }
    pc.onicecandidate = (e) => {
      if (e.candidate)
        void send(id, { type: "candidate", candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      if (!stream.getTracks().some((t) => t.id === e.track.id))
        stream.addTrack(e.track);
      setStreams((prev) => ({ ...prev, [id]: stream }));
    };
    pc.onconnectionstatechange = () => {
      setStatuses((prev) => ({ ...prev, [id]: pc.connectionState }));
      if (
        pc.connectionState === "failed" &&
        myId.current < id &&
        c.restarts < 3
      ) {
        c.restarts++;
        void (async () => {
          await pc.setLocalDescription(
            await pc.createOffer({ iceRestart: true }),
          );
          await send(id, { type: "offer", sdp: pc.localDescription!.sdp });
        })().catch(() => setError(m.error));
      }
    };
    return c;
  }
  async function handleSignal(sender: string, payload: Signal) {
    const c = makePeer(sender),
      pc = c.pc;
    if (payload.type === "candidate") {
      if (payload.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(payload.candidate);
        else c.candidates.push(payload.candidate);
      }
      return;
    }
    if (!payload.sdp) return;
    if (payload.type === "offer") {
      if (pc.signalingState !== "stable")
        await pc.setLocalDescription({ type: "rollback" });
      await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
      for (const candidate of c.candidates.splice(0))
        await pc.addIceCandidate(candidate);
      await pc.setLocalDescription(await pc.createAnswer());
      await send(sender, { type: "answer", sdp: pc.localDescription!.sdp });
    } else if (pc.signalingState === "have-local-offer") {
      await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
      for (const candidate of c.candidates.splice(0))
        await pc.addIceCandidate(candidate);
    }
  }
  async function poll() {
    if (!active.current) return;
    try {
      const r = await fetch(endpoint + "?state=1&after=" + cursor.current, {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      const data = (await r.json()) as MeetingResponse;
      if (r.status === 410) {
        cleanup();
        setEnded(true);
        return;
      }
      if (r.status === 401) {
        cleanup();
        setError(data.error?.message ?? m.expired);
        return;
      }
      if (!r.ok) throw new Error(m.reconnecting);
      if (!active.current) return;
      const list = (data.peers as PeerInfo[]).filter(
        (p) => p.id !== myId.current,
      );
      setPeers(list);
      setError("");
      const ids = new Set(list.map((p) => p.id));
      for (const [id, c] of connections.current) {
        if (!ids.has(id)) {
          c.pc.close();
          connections.current.delete(id);
          setStreams((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      }
      for (const p of list) {
        if (!connections.current.has(p.id)) {
          const c = makePeer(p.id);
          if (myId.current < p.id) {
            await c.pc.setLocalDescription(await c.pc.createOffer());
            await send(p.id, {
              type: "offer",
              sdp: c.pc.localDescription!.sdp,
            });
          }
        }
      }
      for (const signal of data.signals as {
        id: number;
        sender: string;
        payload: Signal;
      }[]) {
        if (ids.has(signal.sender))
          try {
            await handleSignal(signal.sender, signal.payload);
          } catch {
            setError(m.reconnecting);
          }
        cursor.current = Math.max(cursor.current, signal.id);
      }
    } catch {
      if (active.current) setError(m.reconnecting);
    } finally {
      if (active.current) timer.current = setTimeout(() => void poll(), 1500);
    }
  }
  function cleanup() {
    active.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    for (const c of connections.current.values()) c.pc.close();
    connections.current.clear();
    localStream.current?.getTracks().forEach((t) => t.stop());
    displayStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    displayStream.current = null;
    setLocal(null);
    setJoined(false);
    setSharing(false);
    setPeers([]);
    setStreams({});
  }
  async function join(mode: "video" | "audio" | "listen") {
    setBusy(true);
    setError("");
    let stream: MediaStream | null = null;
    try {
      if (!name.trim()) throw new Error(m.name);
      if (!host && !inviteSecret.current) throw new Error(m.expired);
      const result = await api({
        action: "join",
        name,
        invite: inviteSecret.current,
      });
      try {
        stream =
          mode === "listen"
            ? new MediaStream()
            : await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
                video:
                  mode === "video"
                    ? {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 24, max: 30 },
                      }
                    : false,
              });
      } catch {
        await api({ action: "leave" });
        throw new Error(m.mediaError);
      }
      localStream.current = stream;
      setLocal(stream);
      setMic(stream.getAudioTracks().length > 0);
      setCamera(stream.getVideoTracks().length > 0);
      ice.current = result.iceServers;
      myId.current = result.participantId;
      cursor.current = 0;
      active.current = true;
      setJoined(true);
      setElapsed(0);
      setStatuses({});
      start.current = Date.now();
      elapsedTimer.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - start.current) / 1000)),
        1000,
      );
      void poll();
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      setError(e instanceof Error ? e.message : m.error);
    } finally {
      setBusy(false);
    }
  }
  async function leave() {
    cleanup();
    try {
      await api({ action: "leave" });
    } catch {}
  }
  async function end() {
    if (!window.confirm(m.endConfirm)) return;
    try {
      await api({ action: "end" });
      cleanup();
      setEnded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.error);
    }
  }
  async function copyInvite() {
    try {
      let url =
        invite ||
        (inviteSecret.current
          ? location.origin + location.pathname + "#" + inviteSecret.current
          : "");
      if (!url && host) {
        url = (await api({ action: "rotate" })).inviteUrl;
        setInvite(url);
      } else if (!url)
        url = location.origin + location.pathname + "#" + inviteSecret.current;
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.error);
    }
  }
  async function share() {
    try {
      if (displayStream.current) {
        displayStream.current.getTracks().forEach((t) => t.stop());
        displayStream.current = null;
        const original = localStream.current?.getVideoTracks()[0] ?? null;
        for (const c of connections.current.values()) {
          const sender = c.pc
            .getTransceivers()
            .find((t) => t.receiver.track.kind === "video")?.sender;
          if (sender) await sender.replaceTrack(original);
        }
        setSharing(false);
        return;
      }
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      displayStream.current = display;
      const track = display.getVideoTracks()[0];
      track.onended = () => {
        if (displayStream.current) void share();
      };
      for (const c of connections.current.values()) {
        const sender = c.pc
          .getTransceivers()
          .find((t) => t.receiver.track.kind === "video")?.sender;
        if (sender) await sender.replaceTrack(track);
      }
      setSharing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.error);
    }
  }
  return (
    <div className="min-h-screen bg-[#080d11]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#293036] px-5 py-4">
        <div>
          <Link
            href="/meetings"
            className="text-xs tracking-widest text-[#72a7c7]"
          >
            ARRISCHES COMMUNICATION
          </Link>
          <h1 className="mt-1 text-xl font-bold" dir="auto">
            {room.title}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {joined && (
            <time className="font-mono text-[#a5afb5]">
              {Math.floor(elapsed / 3600)
                .toString()
                .padStart(2, "0")}
              :
              {Math.floor((elapsed / 60) % 60)
                .toString()
                .padStart(2, "0")}
              :{(elapsed % 60).toString().padStart(2, "0")}
            </time>
          )}
          <LanguageSwitcher compact />
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-5 sm:p-8">
        {ended ? (
          <div className="py-24 text-center">
            <h2 className="mb-6 text-2xl">{m.ended}</h2>
            <Link href="/meetings" className="meeting-button">
              {m.back}
            </Link>
          </div>
        ) : !joined ? (
          <section className="mx-auto mt-8 max-w-xl rounded-2xl border border-[#293036] bg-[#11181d] p-7">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#72a7c7]/15 text-3xl text-[#72a7c7]">
              ▣
            </div>
            <h2 className="text-2xl font-bold">{m.ready}</h2>
            <p className="my-4 leading-7 text-[#a5afb5]">{m.privacy}</p>
            <label className="block">
              {m.name}
              <input
                className="mt-2 mb-5 w-full rounded-lg border border-[#52616b] bg-[#080d11] p-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={busy || !name.trim()}
                className="meeting-button primary"
                onClick={() => void join("video")}
              >
                {busy ? "…" : host ? m.join : m.guest}
              </button>
              <button
                disabled={busy || !name.trim()}
                className="meeting-button"
                onClick={() => void join("audio")}
              >
                {m.audioOnly}
              </button>
              <button
                disabled={busy || !name.trim()}
                className="meeting-button"
                onClick={() => void join("listen")}
              >
                {m.noMedia}
              </button>
            </div>
            {host && (
              <button
                onClick={() => void copyInvite()}
                className="mt-5 text-sm text-[#72a7c7]"
              >
                {copied ? m.copied : m.copy}
              </button>
            )}
          </section>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <VideoTile
                stream={local}
                name={name + " · " + m.you}
                muted
                status={host ? m.host : ""}
              />
              {peers.map((p) => (
                <VideoTile
                  key={p.id}
                  stream={streams[p.id] ?? null}
                  name={p.name}
                  status={
                    statuses[p.id] === "connected"
                      ? m.connected
                      : statuses[p.id] === "failed"
                        ? m.error
                        : m.connecting
                  }
                />
              ))}
            </div>
            {peers.length === 0 && (
              <p role="status" className="my-7 text-center text-[#a5afb5]">
                {m.waiting}
              </p>
            )}
            <div className="sticky bottom-3 mt-6 flex flex-wrap justify-center gap-3 rounded-xl border border-[#293036] bg-[#11181d]/95 p-4">
              <button
                className="meeting-button"
                aria-pressed={mic}
                disabled={!local?.getAudioTracks().length}
                onClick={() => {
                  localStream.current
                    ?.getAudioTracks()
                    .forEach((t) => (t.enabled = !mic));
                  setMic(!mic);
                }}
              >
                {mic ? "●" : "○"} {m.mic}
              </button>
              <button
                className="meeting-button"
                aria-pressed={camera}
                disabled={!local?.getVideoTracks().length}
                onClick={() => {
                  localStream.current
                    ?.getVideoTracks()
                    .forEach((t) => (t.enabled = !camera));
                  setCamera(!camera);
                }}
              >
                {camera ? "●" : "○"} {m.camera}
              </button>
              <button className="meeting-button" onClick={() => void share()}>
                {sharing ? m.stopShare : m.share}
              </button>
              <button
                className="meeting-button"
                onClick={() => void copyInvite()}
              >
                {copied ? m.copied : m.copy}
              </button>
              <button
                className="meeting-button danger"
                onClick={() => void leave()}
              >
                {m.leave}
              </button>
              {host && (
                <button
                  className="meeting-button danger"
                  onClick={() => void end()}
                >
                  {m.end}
                </button>
              )}
            </div>
          </>
        )}
        {error && (
          <p
            role="alert"
            className="mx-auto my-5 max-w-2xl rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        {invite && (
          <input
            aria-label={m.copy}
            readOnly
            dir="ltr"
            value={invite}
            onFocus={(e) => e.target.select()}
            className="my-4 w-full rounded bg-[#11181d] p-3 text-xs"
          />
        )}
        {host && !ended && (
          <button
            className="mt-5 block text-sm text-[#72a7c7]"
            onClick={async () => {
              try {
                setInvite((await api({ action: "rotate" })).inviteUrl);
                setCopied(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : m.error);
              }
            }}
          >
            {m.renew}
          </button>
        )}
        <p className="mt-5 text-center text-xs leading-6 text-[#8a959c]">
          {m.inviteHint}
        </p>
      </main>
    </div>
  );
}
