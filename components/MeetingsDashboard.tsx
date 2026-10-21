"use client";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "./I18nProvider";
import { meetingMessages } from "@/lib/meeting-i18n";
export type RoomListItem = {
  id: string;
  title: string;
  ended: number;
  created_at: string;
};
export default function MeetingsDashboard({
  initialRooms,
}: {
  initialRooms: RoomListItem[];
}) {
  const { locale } = useI18n(),
    m = meetingMessages[locale];
  const [rooms, setRooms] = useState(initialRooms),
    [title, setTitle] = useState(""),
    [invite, setInvite] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await r.json()) as {
        id: string;
        inviteUrl: string;
        error?: { message: string };
      };
      if (!r.ok) throw new Error(data.error?.message ?? m.error);
      setRooms((prev) => [
        { id: data.id, title, ended: 0, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setInvite(data.inviteUrl);
      setTitle("");
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-widest text-[#72a7c7]">
        ARRISCHES COMMUNICATION
      </p>
      <h1 className="mt-3 text-3xl font-bold">{m.title}</h1>
      <p className="mt-3 text-[#a5afb5]">{m.intro}</p>
      <form
        onSubmit={create}
        className="my-7 rounded-xl border border-[#293036] bg-[#11181d] p-5"
      >
        <h2 className="mb-4 text-lg font-bold">{m.newRoom}</h2>
        <label className="block text-sm">
          {m.roomTitle}
          <input
            className="mt-2 mb-4 w-full rounded-md border border-[#52616b] bg-[#0b0d0e] p-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
          />
        </label>
        <button disabled={busy} className="meeting-button primary">
          {busy ? "…" : m.create}
        </button>
      </form>
      {error && (
        <p role="alert" className="my-4 text-red-300">
          {error}
        </p>
      )}
      {invite && (
        <section className="my-5 rounded-xl border border-[#68aa8d] p-5">
          <p className="mb-3 text-sm">{m.inviteHint}</p>
          <input
            aria-label={m.copy}
            dir="ltr"
            readOnly
            value={invite}
            onFocus={(e) => e.target.select()}
            className="mb-3 w-full rounded bg-black p-3 text-xs"
          />
          <div className="flex flex-wrap gap-3">
            <button
              className="meeting-button primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invite);
                  setCopied(true);
                } catch {
                  setError(m.error);
                }
              }}
            >
              {copied ? m.copied : m.copy}
            </button>
            <Link className="meeting-button" href={invite}>
              {m.join}
            </Link>
          </div>
        </section>
      )}
      <ul className="space-y-3">
        {rooms.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#293036] p-4"
          >
            <div>
              <h2 className="font-semibold" dir="auto">
                {r.title}
              </h2>
              <p className="mt-1 text-xs text-[#8a959c]">
                {new Date(r.created_at).toLocaleDateString(locale)}
                {r.ended ? " · " + m.ended : ""}
              </p>
            </div>
            {!r.ended && (
              <Link className="meeting-button" href={"/meet/" + r.id}>
                {m.open}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-7 text-xs leading-6 text-[#8a959c]">{m.usage}</p>
    </div>
  );
}
