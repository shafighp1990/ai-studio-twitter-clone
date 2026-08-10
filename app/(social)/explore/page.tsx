import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProfileResult from "@/components/ProfileResult";
import Timeline from "@/components/Timeline";
import { SearchIcon } from "@/components/icons";
import { getPosts, getViewer, searchProfiles } from "@/lib/data";
import { getServerI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";

const topics: { label: MessageKey }[] = [
  { label: "topicWeb" },
  { label: "topicDesign" },
  { label: "topicNext" },
  { label: "topicSupabase" },
];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { t } = await getServerI18n();
  const viewer = await getViewer();
  const [posts, profiles] = q.trim()
    ? await Promise.all([getPosts({ search: q, includeReplies: true }), searchProfiles(q)])
    : [[], []];

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-2">
        <form action="/explore" className="relative min-w-0 flex-1" role="search">
          <SearchIcon size={19} className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            name="q"
            defaultValue={q}
            type="search"
            dir="auto"
            autoFocus={Boolean(q)}
            aria-label={t("search")}
            placeholder={t("exploreSearchPlaceholder")}
            className="h-[44px] w-full rounded-sm border border-[var(--border)] bg-[var(--surface)] ps-12 pe-4 outline-none placeholder:text-[var(--muted)] focus:border-[var(--blue)]"
          />
        </form>
        <LanguageSwitcher compact />
      </header>

      {q.trim() ? (
        <>
          <h1 className="border-b border-[var(--border)] px-4 py-4 text-xl font-semibold">{t("searchResults")}</h1>
          {profiles.length > 0 && (
            <section>
              <h2 className="border-b border-[var(--border)] px-4 py-3 text-lg font-semibold">{t("people")}</h2>
              {profiles.slice(0, 3).map((profile) => <ProfileResult key={profile.id} profile={profile} viewer={viewer} />)}
            </section>
          )}
          {posts.length > 0 && <h2 className="border-b border-[var(--border)] px-4 py-3 text-lg font-semibold">{t("posts")}</h2>}
          {(posts.length > 0 || profiles.length === 0) && (
            <Timeline
              posts={posts}
              viewer={viewer}
              emptyTitle={t("noSearchResults")}
              emptyText={t("noSearchResultsText")}
            />
          )}
        </>
      ) : (
        <section className="px-5 py-8">
          <div className="border-s-4 border-[var(--blue)] ps-4">
            <p className="text-[12px] font-semibold tracking-[0.12em] text-[var(--muted)]">{t("exploreKicker")}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">{t("exploreTitle")}</h1>
            <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">{t("exploreText")}</p>
          </div>
          <h2 className="mt-9 text-lg font-semibold">{t("topics")}</h2>
          <div className="mt-3 grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
            {topics.map((topic) => (
              <Link
                key={topic.label}
                href={`/explore?q=${encodeURIComponent(t(topic.label))}`}
                className="bg-[var(--background)] px-4 py-4 text-[15px] font-semibold transition hover:bg-[var(--surface)]"
              >
                {t(topic.label)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
