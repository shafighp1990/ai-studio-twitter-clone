"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/lib/types";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import { BellIcon, HeartIcon, RepostIcon, UserIcon } from "./icons";

const notificationText = {
  like: "notificationLike",
  repost: "notificationRepost",
  reply: "notificationReply",
  follow: "notificationFollow",
} as const;

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  if (type === "like") return <HeartIcon size={29} fill="currentColor" className="text-[#d66a91]" />;
  if (type === "repost") return <RepostIcon size={29} className="text-[#4db58b]" />;
  if (type === "follow") return <UserIcon size={29} fill="currentColor" className="text-[#72a7c7]" />;
  return <BellIcon size={29} fill="currentColor" className="text-[#72a7c7]" />;
}

export default function NotificationsList({ items, viewerId }: { items: NotificationItem[]; viewerId: string }) {
  const { t } = useI18n();

  useEffect(() => {
    const unreadIds = items.filter((item) => !item.read).map((item) => item.id);
    if (unreadIds.length === 0) return;
    const supabase = createClient();
    void supabase.from("notifications").update({ read: true }).eq("recipient_id", viewerId).in("id", unreadIds);
  }, [items, viewerId]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[400px] px-8 py-16">
        <h2 className="text-[31px] font-extrabold leading-9">{t("notificationsEmptyTitle")}</h2>
        <p className="mt-2 text-[15px] text-[#8a959c]">{t("notificationsEmptyText")}</p>
      </div>
    );
  }

  return items.map((item) => (
    <Link key={item.id} href={item.post ? `/post/${item.post.id}` : `/${item.actor.username}`} className={`flex gap-3 border-b border-[#293036] px-7 py-3 transition hover:bg-white/[0.03] ${item.read ? "" : "bg-[#72a7c7]/[0.06]"}`}>
      <div className="w-9 pt-1"><NotificationIcon type={item.type} /></div>
      <div className="min-w-0 flex-1">
        <Avatar profile={item.actor} size={32} link={false} />
        <p className="mt-2 text-[15px] leading-5">
          <span className="inline-flex items-center gap-1 font-bold" dir="auto">{item.actor.name} {item.actor.verified && <VerifiedBadge />}</span>{" "}
          {t(notificationText[item.type])}
        </p>
        {item.post && <p dir="auto" className="mt-1 line-clamp-2 text-start text-[15px] text-[#8a959c]">{item.post.content}</p>}
      </div>
    </Link>
  ));
}
