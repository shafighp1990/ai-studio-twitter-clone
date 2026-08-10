"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/lib/types";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import { BellIcon, HeartIcon, RepostIcon, UserIcon } from "./icons";

const notificationText = {
  like: "liked your post",
  repost: "reposted your post",
  reply: "replied to your post",
  follow: "followed you",
};

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  if (type === "like") return <HeartIcon size={29} fill="currentColor" className="text-[#f91880]" />;
  if (type === "repost") return <RepostIcon size={29} className="text-[#00ba7c]" />;
  if (type === "follow") return <UserIcon size={29} fill="currentColor" className="text-[#1d9bf0]" />;
  return <BellIcon size={29} fill="currentColor" className="text-[#1d9bf0]" />;
}

export default function NotificationsList({ items, viewerId }: { items: NotificationItem[]; viewerId: string }) {
  useEffect(() => {
    const unreadIds = items.filter((item) => !item.read).map((item) => item.id);
    if (unreadIds.length === 0) return;
    const supabase = createClient();
    void supabase.from("notifications").update({ read: true }).eq("recipient_id", viewerId).in("id", unreadIds);
  }, [items, viewerId]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[400px] px-8 py-16">
        <h2 className="text-[31px] font-extrabold leading-9">Nothing to see here — yet</h2>
        <p className="mt-2 text-[15px] text-[#71767b]">From likes to follows and replies, this is where all the action happens.</p>
      </div>
    );
  }

  return items.map((item) => (
    <Link key={item.id} href={item.post ? `/post/${item.post.id}` : `/${item.actor.username}`} className={`flex gap-3 border-b border-[#2f3336] px-7 py-3 transition hover:bg-white/[0.03] ${item.read ? "" : "bg-[#1d9bf0]/[0.06]"}`}>
      <div className="w-9 pt-1"><NotificationIcon type={item.type} /></div>
      <div className="min-w-0 flex-1">
        <Avatar profile={item.actor} size={32} link={false} />
        <p className="mt-2 text-[15px] leading-5">
          <span className="inline-flex items-center gap-1 font-bold">{item.actor.name} {item.actor.verified && <VerifiedBadge />}</span>{" "}
          {notificationText[item.type]}
        </p>
        {item.post && <p className="mt-1 line-clamp-2 text-[15px] text-[#71767b]">{item.post.content}</p>}
      </div>
    </Link>
  ));
}
