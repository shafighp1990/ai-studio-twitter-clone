import Link from "next/link";
import { BackIcon } from "./icons";

export default function PageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[53px] items-center gap-5 border-b border-[#2f3336] bg-black/80 px-4 backdrop-blur-md">
      {backHref && (
        <Link href={backHref} className="-ml-2 rounded-full p-2 transition hover:bg-white/10" aria-label="Back">
          <BackIcon size={22} />
        </Link>
      )}
      <div className="min-w-0 py-1">
        <h1 className="truncate text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-[13px] text-[#71767b]">{subtitle}</p>}
      </div>
    </header>
  );
}
