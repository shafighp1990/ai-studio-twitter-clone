/* eslint-disable @next/next/no-img-element -- Admin previews show original uploaded media for moderation. */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Row = Record<string, string | number | null | boolean>;
type Result = {
  rows?: Row[];
  total?: number;
  pageSize?: number;
  nextCursor?: string | null;
  counts?: Record<string, number>;
  tables?: string[];
  error?: { message: string };
  temporaryPassword?: string;
};
const tabs = [
  ["overview", "نمای کلی", "◈"],
  ["users", "کاربران", "◎"],
  ["posts", "پست‌ها", "▤"],
  ["media", "تصاویر", "▧"],
  ["rooms", "اتاق‌ها", "▣"],
  ["data", "اطلاعات سایت", "▦"],
  ["admin_audit", "سابقهٔ مدیریت", "↺"],
] as const;
const tableNames: Record<string, string> = {
  users: "حساب‌های کاربری",
  posts: "پست‌ها",
  profiles: "نمایه‌ها",
  rooms: "اتاق‌های گفت‌وگو",
  post_likes: "پسندها",
  reposts: "بازنشرها",
  bookmarks: "نشانک‌ها",
  follows: "دنبال‌کردن‌ها",
  notifications: "اعلان‌ها",
  sessions: "نشست‌های ورود",
  mfa_factors: "وضعیت ورود دومرحله‌ای",
  participants: "شرکت‌کنندگان",
  signals: "رویدادهای اتصال",
  rate_limits: "محدودیت درخواست‌ها",
  removed_media: "تصاویر حذف‌شده",
  admin_audit: "عملیات ادمین",
};
const columnNames: Record<string, string> = {
  id: "شناسه",
  email: "ایمیل",
  username: "نام کاربری",
  name: "نام",
  is_admin: "مدیر",
  disabled: "مسدود",
  must_change_password: "نیاز به تغییر رمز",
  email_verified: "ایمیل تأییدشده",
  created_at: "تاریخ ایجاد",
  updated_at: "آخرین تغییر",
  avatar_url: "عکس نمایه",
  banner_url: "تصویر سربرگ",
  post_count: "تعداد پست",
  mfa_enabled: "ورود دومرحله‌ای",
  author_id: "نویسنده",
  content: "متن",
  image_url: "تصویر",
  reply_to_id: "پاسخ به",
  external_url: "لینک منبع",
  bio: "دربارهٔ کاربر",
  location: "مکان",
  website: "وب‌سایت",
  verified: "نشان تأیید",
  host_id: "میزبان",
  title: "عنوان",
  ended: "پایان‌یافته",
  invite_expires: "اعتبار دعوت",
  participants: "حاضرین",
  post_id: "پست",
  user_id: "کاربر",
  follower_id: "دنبال‌کننده",
  following_id: "دنبال‌شونده",
  recipient_id: "گیرنده",
  actor_id: "انجام‌دهنده",
  type: "نوع",
  read: "خوانده‌شده",
  aal: "سطح ورود",
  expires_at: "پایان اعتبار",
  mfa_verified_at: "تأیید دومرحله‌ای",
  friendly_name: "نام دستگاه",
  room_id: "اتاق",
  last_seen: "آخرین حضور",
  sender: "فرستنده",
  recipient: "گیرنده",
  hits: "تعداد درخواست",
  key: "مسیر تصویر",
  removed_by: "حذف‌کننده",
  action: "عملیات",
  target_id: "شناسهٔ هدف",
  details: "جزئیات",
  admin_username: "مدیر",
};
const actionNames: Record<string, string> = {
  reset_password: "ساخت رمز موقت",
  disable_user: "مسدودکردن حساب",
  enable_user: "فعال‌کردن حساب",
  revoke_sessions: "خروج از دستگاه‌ها",
  delete_post: "حذف پست",
  remove_image: "حذف تصویر",
  remove_profile_image: "حذف تصویر نمایه",
  end_room: "پایان اتاق",
};
const field =
  "w-full rounded-xl border border-[#344650] bg-[#0d151c] px-4 py-3 text-sm outline-none focus:border-[#8bc4df]";
function date(v: unknown) {
  if (!v) return "—";
  const d = new Date(typeof v === "number" ? v : String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("fa-IR");
}
export default function AdminDashboard({
  admin,
}: {
  admin: { id: string; name: string; username: string };
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview"),
    [table, setTable] = useState("users"),
    [rows, setRows] = useState<Row[]>([]),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [tables, setTables] = useState<string[]>([]),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [cursor, setCursor] = useState(""),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState<Row | null>(null),
    [temporary, setTemporary] = useState<{
      password: string;
      username: string;
    } | null>(null),
    [showPassword, setShowPassword] = useState(false),
    [revision, setRevision] = useState(0);
  const section = tab === "data" ? table : tab;
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          "/api/admin?" +
            new URLSearchParams({
              section,
              page: String(page),
              q: search,
              cursor,
            }),
          { cache: "no-store", signal: controller.signal },
        );
        const data = (await response.json()) as Result;
        if (!response.ok) {
          if (response.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error(
            response.status === 403
              ? "این حساب دسترسی مدیریت ندارد."
              : (data.error?.message ?? "دریافت اطلاعات انجام نشد."),
          );
        }
        if (!active) return;
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setNextCursor(data.nextCursor ?? null);
        if (data.counts) setCounts(data.counts);
        if (data.tables) setTables(data.tables);
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "ارتباط با سایت برقرار نشد.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [section, page, search, cursor, revision, router]);
  function navigate(value: string) {
    setTab(value);
    setPage(0);
    setCursor("");
    setSearch("");
    setQuery("");
    setSelected(null);
    setMessage("");
    setTemporary(null);
  }
  async function mutate(
    action: string,
    id: string,
    extra: Record<string, string> = {},
    targetName = "",
  ) {
    const descriptions: Record<string, string> = {
      delete_post:
        "این پست و پاسخ‌های وابسته برای همیشه حذف می‌شوند. ادامه می‌دهی؟",
      remove_image:
        "این تصویر از فضای ذخیره‌سازی و همهٔ پست‌ها و نمایه‌های مرتبط حذف می‌شود. ادامه می‌دهی؟",
      remove_profile_image: "این تصویر از سایت حذف می‌شود. ادامه می‌دهی؟",
      reset_password:
        "رمز فعلی این کاربر عوض می‌شود؛ نشست‌ها و اتاق‌های فعال او بسته می‌شوند. ادامه می‌دهی؟",
      disable_user:
        "این کاربر از حساب خارج می‌شود و تا فعال‌سازی دوباره نمی‌تواند وارد شود. اتاق‌های او بسته می‌شوند. ادامه می‌دهی؟",
      revoke_sessions: "تمام نشست‌ها و اتاق‌های فعال این کاربر بسته شوند؟",
      end_room: "این اتاق برای همهٔ شرکت‌کنندگان پایان یابد؟",
    };
    if (descriptions[action] && !window.confirm(descriptions[action])) return;
    setBusy(true);
    setError("");
    setMessage("");
    setTemporary(null);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, ...extra }),
        signal: AbortSignal.timeout(30000),
      });
      const data = (await r.json()) as Result;
      if (!r.ok) throw new Error(data.error?.message ?? "عملیات انجام نشد.");
      if (data.temporaryPassword) {
        setTemporary({
          password: data.temporaryPassword,
          username: targetName,
        });
        setShowPassword(false);
      }
      setSelected(null);
      setMessage("عملیات انجام شد و در سابقهٔ مدیریت ثبت شد.");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    router.replace("/login");
    router.refresh();
  }
  const chooseUser = (row: Row) => {
    setSelected(row);
    setTemporary(null);
  };
  return (
    <div
      dir="rtl"
      lang="fa"
      className="min-h-screen bg-[#080f15] text-[#e9f0f4]"
    >
      <header className="border-b border-[#233541] bg-[#0e1922]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-9">
          <div>
            <p className="text-xs tracking-[.16em] text-[#8bc4df]">
              ARRISCHES COMMUNICATION
            </p>
            <h1 className="mt-2 text-xl font-bold">مرکز مدیریت</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-[#487362] bg-[#18382d] px-3 py-1.5 text-[#addec6]">
              مدیر سایت
            </span>
            <span dir="auto">
              {admin.name}{" "}
              <span dir="ltr" className="text-[#8ca0ad]">
                @{admin.username}
              </span>
            </span>
            <Link href="/" className="admin-button">
              مشاهدهٔ سایت ↗
            </Link>
            <button onClick={() => void logout()} className="admin-button">
              خروج
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] gap-6 p-4 lg:grid-cols-[210px_minmax(0,1fr)] lg:p-8">
        <aside>
          <nav
            aria-label="بخش‌های مدیریت"
            className="flex gap-2 overflow-x-auto pb-3 lg:sticky lg:top-6 lg:flex-col"
          >
            {tabs.map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => navigate(key)}
                aria-current={tab === key ? "page" : undefined}
                className={
                  "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-start text-sm transition " +
                  (tab === key
                    ? "bg-[#223d4f] font-bold text-[#c6e9fa]"
                    : "text-[#a3b4c0] hover:bg-[#13232f]")
                }
              >
                <span aria-hidden="true" className="text-xl">
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-7 hidden rounded-2xl border border-[#263b49] p-4 text-xs leading-6 text-[#9fb2bf] lg:block">
            ورود شما دسترسی مدیریتی دارد. عملیات حساس ثبت می‌شوند.
            <Link
              href="/auth/change-password"
              className="mt-3 block text-[#9bd3ee]"
            >
              تغییر رمز خودم ←
            </Link>
            <Link
              href="/settings/security"
              className="mt-2 block text-[#9bd3ee]"
            >
              ورود دومرحله‌ای ←
            </Link>
          </div>
        </aside>
        <main className="min-w-0">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">
                {tabs.find((t) => t[0] === tab)?.[1]}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#91a7b6]">
                {tab === "overview"
                  ? "اطلاعات و مدیریت روزمرهٔ سایت، در یک صفحه."
                  : tab === "users"
                    ? "ایمیل، نام کاربری، وضعیت حساب و کنترل دسترسی کاربران."
                    : tab === "data"
                      ? "اطلاعات ثبت‌شده را بدون ورود به پایگاه داده مرور کن."
                      : tab === "media"
                        ? "تصاویر پست‌ها، نمایه‌ها و فایل‌های بارگذاری‌شده."
                        : tab === "admin_audit"
                          ? "چه کسی، چه کاری را و چه زمانی انجام داده است."
                          : "جست‌وجو و مدیریت محتوای سایت."}
              </p>
            </div>
            <button
              disabled={loading || busy}
              className="admin-button"
              onClick={refresh}
            >
              ↻ تازه‌سازی
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mb-5 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-200"
            >
              {message}
            </p>
          )}
          {temporary && (
            <section className="mb-6 rounded-2xl border border-amber-700 bg-[#302717] p-5">
              <h3 className="font-bold">
                رمز موقت برای <bdi>{temporary.username}</bdi>
              </h3>
              <p className="my-3 text-sm leading-7 text-[#e1d1af]">
                این رمز فقط همین‌جا نمایش داده می‌شود؛ آن را مستقیم به صاحب حساب
                تحویل بده. کاربر در ورود بعدی باید رمز تازه‌ای انتخاب کند. ورود
                دومرحله‌ای او حفظ می‌شود.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="رمز موقت"
                  dir="ltr"
                  type={showPassword ? "text" : "password"}
                  readOnly
                  value={temporary.password}
                  className={field + " max-w-md font-mono"}
                />
                <button
                  className="admin-button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "پنهان‌کردن" : "نمایش رمز"}
                </button>
                <button
                  className="admin-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(temporary.password);
                      setMessage("رمز موقت کپی شد.");
                    } catch {
                      setError("کپی خودکار انجام نشد؛ رمز را انتخاب و کپی کن.");
                    }
                  }}
                >
                  کپی رمز
                </button>
                <button
                  className="admin-button"
                  onClick={() => setTemporary(null)}
                >
                  بستن
                </button>
              </div>
            </section>
          )}
          {tab === "overview" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["users", "کاربر", "users"],
                  ["posts", "پست", "posts"],
                  ["rooms", "اتاق باز", "rooms"],
                  ["disabled", "حساب مسدود", "users"],
                ].map(([key, label, to]) => (
                  <button
                    key={key}
                    onClick={() => navigate(to)}
                    className="rounded-2xl border border-[#29404f] bg-gradient-to-bl from-[#142736] to-[#0d1923] p-6 text-start"
                  >
                    <p className="text-sm text-[#91abba]">{label}</p>
                    <strong className="mt-3 block text-4xl text-[#d2edfa]">
                      {loading
                        ? "…"
                        : (counts[key] ?? 0).toLocaleString("fa-IR")}
                    </strong>
                    <p className="mt-5 text-xs text-[#8bc4df]">
                      مشاهده و مدیریت ←
                    </p>
                  </button>
                ))}
              </div>
              <section className="mt-6 grid gap-5 rounded-2xl border border-[#29404f] bg-[#101e28] p-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-bold">کنترل حساب‌ها</h3>
                  <p className="mt-3 text-sm leading-8 text-[#a6b9c6]">
                    اطلاعات ورود کاربران شامل ایمیل و نام کاربری در بخش کاربران
                    دیده می‌شود. رمز فعلی قابل خواندن نیست؛ برای کمک به کاربر،
                    رمز موقت بساز یا ورود دستگاه‌های او را ببند.
                  </p>
                  <button
                    className="admin-button mt-4"
                    onClick={() => navigate("users")}
                  >
                    رفتن به کاربران
                  </button>
                </div>
                <div className="rounded-xl bg-[#09141b] p-5">
                  <h3 className="font-bold">حساب مدیریتی شما</h3>
                  <p className="my-3 text-sm text-[#9fb4c3]">
                    {admin.name} · <bdi>@{admin.username}</bdi>
                  </p>
                  <Link
                    href="/auth/change-password"
                    className="block py-2 text-sm text-[#a7d8f0]"
                  >
                    تغییر رمز ورود ←
                  </Link>
                  <Link
                    href="/settings/security"
                    className="block py-2 text-sm text-[#a7d8f0]"
                  >
                    تنظیم ورود دومرحله‌ای ←
                  </Link>
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap gap-3">
                {tab === "data" && (
                  <select
                    aria-label="مجموعهٔ اطلاعات"
                    value={table}
                    onChange={(e) => {
                      setTable(e.target.value);
                      setPage(0);
                      setSearch("");
                      setQuery("");
                    }}
                    className={field + " max-w-xs"}
                  >
                    {(tables.length ? tables : Object.keys(tableNames)).map(
                      (t) => (
                        <option key={t} value={t}>
                          {tableNames[t] ?? t}
                        </option>
                      ),
                    )}
                  </select>
                )}
                {["users", "posts", "rooms", "media", "profiles"].includes(
                  section,
                ) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSearch(query);
                      setPage(0);
                      setCursor("");
                    }}
                    className="flex min-w-0 flex-1 gap-2"
                  >
                    <input
                      aria-label="جست‌وجو"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={
                        section === "media"
                          ? "ابتدای مسیر فایل یا شناسهٔ کاربر"
                          : "جست‌وجوی نام، ایمیل، عنوان یا شناسه…"
                      }
                      className={field}
                    />
                    <button className="admin-button">جست‌وجو</button>
                  </form>
                )}
              </div>
              {tab === "data" && (
                <p className="mb-5 text-xs leading-6 text-[#91a7b6]">
                  رمزها، کلیدهای ورود و محتوای فنی اتصال‌ها نمایش داده نمی‌شوند.
                  این بخش برای مشاهده است؛ تغییرات را از بخش‌های مدیریت انجام
                  بده.
                </p>
              )}
              {selected && tab === "users" && (
                <section className="mb-6 rounded-2xl border border-[#5685a0] bg-[#132734] p-5">
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold" dir="auto">
                        {selected.name}
                      </h3>
                      <p className="mt-2 text-sm text-[#b0c6d3]">
                        <bdi>@{selected.username}</bdi> ·{" "}
                        <bdi>{selected.email}</bdi>
                      </p>
                    </div>
                    <button
                      className="admin-button"
                      onClick={() => setSelected(null)}
                    >
                      بستن
                    </button>
                  </div>
                  <dl className="my-5 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[#8ea9ba]">شناسهٔ حساب</dt>
                      <dd className="mt-1 break-all font-mono text-xs">
                        {selected.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#8ea9ba]">تاریخ عضویت</dt>
                      <dd className="mt-1">{date(selected.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#8ea9ba]">ورود دومرحله‌ای</dt>
                      <dd className="mt-1">
                        {selected.mfa_enabled ? "فعال" : "غیرفعال"}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy || selected.id === admin.id}
                      className="admin-button"
                      onClick={() =>
                        void mutate(
                          "reset_password",
                          String(selected.id),
                          {},
                          String(selected.username),
                        )
                      }
                    >
                      ساخت رمز موقت
                    </button>
                    <button
                      disabled={busy || selected.id === admin.id}
                      className="admin-button"
                      onClick={() =>
                        void mutate("revoke_sessions", String(selected.id))
                      }
                    >
                      خروج از همهٔ دستگاه‌ها
                    </button>
                    <button
                      disabled={busy || !!selected.is_admin}
                      className="admin-button danger"
                      onClick={() =>
                        void mutate(
                          selected.disabled ? "enable_user" : "disable_user",
                          String(selected.id),
                        )
                      }
                    >
                      {selected.disabled ? "فعال‌کردن حساب" : "مسدودکردن حساب"}
                    </button>
                    {["avatar_url", "banner_url"].map(
                      (f) =>
                        selected[f] && (
                          <button
                            key={f}
                            disabled={busy}
                            className="admin-button danger"
                            onClick={() =>
                              void mutate(
                                "remove_profile_image",
                                String(selected.id),
                                { field: f },
                              )
                            }
                          >
                            {f === "avatar_url"
                              ? "حذف عکس نمایه"
                              : "حذف تصویر سربرگ"}
                          </button>
                        ),
                    )}
                  </div>
                  {selected.id === admin.id && (
                    <Link
                      href="/auth/change-password"
                      className="mt-4 block text-sm text-[#a8dcf4]"
                    >
                      برای تغییر رمز خودت اینجا برو ←
                    </Link>
                  )}
                </section>
              )}
              {loading ? (
                <p
                  role="status"
                  className="rounded-2xl border border-[#263c4b] p-10 text-center text-[#9cb1bf]"
                >
                  در حال دریافت اطلاعات…
                </p>
              ) : rows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#344b59] p-14 text-center text-[#9cb1bf]">
                  اطلاعاتی برای نمایش وجود ندارد.
                </p>
              ) : tab === "users" ? (
                <div className="overflow-x-auto rounded-2xl border border-[#29404f]">
                  <table className="w-full text-start text-sm">
                    <thead className="bg-[#142631] text-[#a9c1d0]">
                      <tr>
                        {["کاربر", "ایمیل", "وضعیت", "پست‌ها", "مدیریت"].map(
                          (x) => (
                            <th key={x} className="p-4 text-start font-medium">
                              {x}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={String(row.id)}
                          className="border-t border-[#243946] bg-[#0e1a23]"
                        >
                          <td className="p-4">
                            <strong className="block" dir="auto">
                              {row.name}
                            </strong>
                            <bdi className="mt-1 block text-xs text-[#8ea9ba]">
                              @{row.username}
                            </bdi>
                          </td>
                          <td className="p-4">
                            <bdi>{row.email}</bdi>
                          </td>
                          <td className="p-4">
                            <span
                              className={
                                row.disabled
                                  ? "text-rose-300"
                                  : row.is_admin
                                    ? "text-amber-200"
                                    : "text-emerald-200"
                              }
                            >
                              {row.disabled
                                ? "مسدود"
                                : row.is_admin
                                  ? "ادمین"
                                  : "فعال"}
                            </span>
                            {!!row.must_change_password && (
                              <p className="mt-1 text-xs text-amber-200">
                                رمز موقت
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            {Number(row.post_count).toLocaleString("fa-IR")}
                          </td>
                          <td className="p-4">
                            <button
                              className="admin-button"
                              onClick={() => chooseUser(row)}
                            >
                              مدیریت
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : tab === "posts" ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {rows.map((row) => (
                    <article
                      key={String(row.id)}
                      className="rounded-2xl border border-[#29404f] bg-[#0f1d27] p-5"
                    >
                      <div className="flex justify-between gap-3 text-xs text-[#93aebf]">
                        <bdi>@{row.username}</bdi>
                        <span>{date(row.created_at)}</span>
                      </div>
                      <p
                        dir="auto"
                        className="my-5 whitespace-pre-wrap break-words leading-8"
                      >
                        {row.content}
                      </p>
                      {row.image_url && (
                        <img
                          src={String(row.image_url)}
                          alt="تصویر پست"
                          className="mb-4 max-h-64 w-full rounded-xl object-contain"
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Link href={"/post/" + row.id} className="admin-button">
                          مشاهدهٔ پست ↗
                        </Link>
                        <button
                          disabled={busy}
                          className="admin-button danger"
                          onClick={() =>
                            void mutate("delete_post", String(row.id))
                          }
                        >
                          حذف پست و پاسخ‌ها
                        </button>
                        {row.image_url &&
                          String(row.image_url).includes("/api/media/") && (
                            <button
                              disabled={busy}
                              className="admin-button danger"
                              onClick={() =>
                                void mutate("remove_image", "", {
                                  key: decodeURIComponent(
                                    new URL(
                                      String(row.image_url),
                                      location.origin,
                                    ).pathname.slice("/api/media/".length),
                                  ),
                                })
                              }
                            >
                              حذف تصویر
                            </button>
                          )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : tab === "media" ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {rows.map((row) => (
                    <article
                      key={String(row.key)}
                      className="overflow-hidden rounded-2xl border border-[#29404f] bg-[#0f1d27]"
                    >
                      <img
                        src={String(row.url)}
                        alt="تصویر بارگذاری‌شده"
                        className="aspect-video w-full bg-[#172b39] object-contain"
                      />
                      <div className="p-4">
                        <p className="mb-2 text-sm">
                          <bdi>@{row.username || "—"}</bdi> ·{" "}
                          {(Number(row.size) / 1024).toLocaleString("fa-IR", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          KB
                        </p>
                        <p
                          dir="ltr"
                          className="mb-4 break-all text-xs text-[#90a8b8]"
                        >
                          {row.key}
                        </p>
                        <button
                          disabled={busy}
                          className="admin-button danger"
                          onClick={() =>
                            void mutate("remove_image", "", {
                              key: String(row.key),
                            })
                          }
                        >
                          حذف تصویر
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : tab === "rooms" ? (
                <div className="space-y-3">
                  {rows.map((row) => (
                    <article
                      key={String(row.id)}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#29404f] bg-[#0f1d27] p-5"
                    >
                      <div>
                        <h3 className="font-bold" dir="auto">
                          {row.title}
                        </h3>
                        <p className="mt-2 text-sm text-[#90a8b8]">
                          میزبان <bdi>@{row.username}</bdi> ·{" "}
                          {row.ended
                            ? "پایان‌یافته"
                            : Number(row.participants).toLocaleString("fa-IR") +
                              " نفر حاضر"}
                        </p>
                      </div>
                      {!row.ended && (
                        <button
                          disabled={busy}
                          className="admin-button danger"
                          onClick={() =>
                            void mutate("end_room", String(row.id))
                          }
                        >
                          پایان جلسه
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#29404f]">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-[#142631]">
                      <tr>
                        {Object.keys(rows[0]).map((k) => (
                          <th
                            key={k}
                            className="whitespace-nowrap p-3 text-start text-[#a5bfce]"
                          >
                            {columnNames[k] ?? k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr
                          key={String(row.id ?? i)}
                          className="border-t border-[#243946]"
                        >
                          {Object.entries(row).map(([k, v]) => (
                            <td
                              key={k}
                              dir="auto"
                              className="max-w-sm min-w-24 break-words p-3 leading-6"
                            >
                              {k === "action"
                                ? (actionNames[String(v)] ?? v)
                                : k.endsWith("_at") ||
                                    ["last_seen", "invite_expires"].includes(k)
                                  ? date(v)
                                  : v === null
                                    ? "—"
                                    : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-5 flex items-center justify-between gap-3 text-sm text-[#90a9ba]">
                {tab === "media" ? (
                  <>
                    <button
                      className="admin-button"
                      disabled={!cursor || loading}
                      onClick={() => setCursor("")}
                    >
                      ابتدای فهرست
                    </button>
                    <button
                      className="admin-button"
                      disabled={!nextCursor || loading}
                      onClick={() => setCursor(nextCursor ?? "")}
                    >
                      تصاویر بعدی ←
                    </button>
                  </>
                ) : (
                  <>
                    <span>
                      {total.toLocaleString("fa-IR")} مورد · صفحهٔ{" "}
                      {(page + 1).toLocaleString("fa-IR")}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="admin-button"
                        disabled={page === 0 || loading}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        قبلی
                      </button>
                      <button
                        className="admin-button"
                        disabled={(page + 1) * 40 >= total || loading}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        بعدی
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
