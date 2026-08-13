import type { Metadata } from "next";
import { Fira_Sans, Noto_Sans_Arabic } from "next/font/google";
import I18nProvider from "@/components/I18nProvider";
import { getDirection } from "@/lib/i18n";
import { getServerI18n } from "@/lib/i18n/server";
import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "cyrillic"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL
        ?? "https://ai-studio-twitter-clone.aistudiotest.workers.dev",
    ),
    title: {
      default: t("metaTitle"),
      template: "%s / AI Studio",
    },
    description: t("metaDescription"),
    openGraph: {
      type: "website",
      siteName: "AI Studio",
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
    twitter: {
      card: "summary",
      title: t("metaTitle"),
      description: t("metaDescription"),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getServerI18n();

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      className={`${firaSans.variable} ${notoSansArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[#0b0d0e] text-[#e7ebed]">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
