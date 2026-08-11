"use client";

import { useI18n } from "@/components/I18nProvider";
import {
  externalPlatformLabel,
  parseExternalPostUrl,
} from "@/lib/external-posts";
import { LinkIcon, RepostIcon, ReplyIcon } from "./icons";

export default function ExternalPostCard({ url }: { url: string }) {
  const { locale, t } = useI18n();
  const reference = parseExternalPostUrl(url);

  if (!reference) return null;

  const platformName = externalPlatformLabel(reference.platform);
  const xLanguage = locale === "fa" ? "fa" : locale;
  const displayUrl = reference.url.replace(/^https:\/\/(?:www\.)?/, "");

  return (
    <section
      className="mt-3 overflow-hidden border border-[#364048] bg-[#101315]"
      aria-label={t("externalSourceFrom", { platform: platformName })}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#293036] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#c8d0d5]">
          <LinkIcon size={17} />
          <span>{t("externalSourceFrom", { platform: platformName })}</span>
        </div>
        <a
          href={reference.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          referrerPolicy="no-referrer"
          className="shrink-0 text-sm font-semibold text-[#72a7c7] hover:underline"
        >
          {t("externalViewOriginal")}
        </a>
      </div>

      <div className="px-3 py-3">
        <p className="text-sm leading-5 text-[#aab4ba]">
          {t("externalReferenceNotice", { platform: platformName })}
        </p>
        <p dir="ltr" className="mt-2 truncate text-start text-xs text-[#718089]" title={reference.url}>
          {displayUrl}
        </p>
      </div>

      {reference.platform === "x" && reference.postId && (
        <div className="flex flex-wrap gap-4 border-t border-[#293036] px-3 py-2 text-sm">
          <a
            href={`https://twitter.com/intent/retweet?tweet_id=${encodeURIComponent(reference.postId)}&lang=${encodeURIComponent(xLanguage)}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            referrerPolicy="no-referrer"
            className="inline-flex items-center gap-1.5 text-[#aab4ba] hover:text-[#72a7c7]"
          >
            <RepostIcon size={16} />
            {t("externalRepostOnX")}
          </a>
          <a
            href={`https://twitter.com/intent/tweet?in_reply_to=${encodeURIComponent(reference.postId)}&lang=${encodeURIComponent(xLanguage)}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            referrerPolicy="no-referrer"
            className="inline-flex items-center gap-1.5 text-[#aab4ba] hover:text-[#72a7c7]"
          >
            <ReplyIcon size={16} />
            {t("externalReplyOnX")}
          </a>
        </div>
      )}
    </section>
  );
}
