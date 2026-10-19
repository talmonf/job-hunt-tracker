import Link from "next/link";
import { auth } from "@/auth";
import { AppHeader } from "@/components/header";
import { LanguageSwitch } from "@/components/widgets";
import { setLoginLanguage } from "@/lib/actions/auth";
import { t, type Lang, type MessageKey } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { publicLang } from "@/lib/public-lang";
import { hidePersonalInfo } from "@/lib/session";

export const dynamic = "force-dynamic";

const sections: { title: MessageKey; paragraphs: MessageKey[] }[] = [
  { title: "privacyAccountTitle", paragraphs: ["privacyAccountBody", "privacyAccountUrls", "privacyAccountHide"] },
  { title: "privacyStoredTitle", paragraphs: ["privacyStoredBody", "privacyFilesBody"] },
  { title: "privacySentTitle", paragraphs: ["privacySentIntro", "privacySentAi", "privacySentGoogle", "privacySentMail", "privacySentStripe"] },
  { title: "privacySignInTitle", paragraphs: ["privacySignInBody"] },
  { title: "privacyOperatorTitle", paragraphs: ["privacyOperatorBody"] },
];

function PrivacyArticle({ lang }: { lang: Lang }) {
  return (
    <article className="mx-auto max-w-3xl rounded-xl bg-slate-900 p-5 ring-1 ring-slate-800">
      <h1 className="text-2xl font-semibold text-white">{t(lang, "privacy")}</h1>
      {sections.map((section) => (
        <section key={section.title} className="mt-6">
          <h2 className="text-lg font-semibold text-white">{t(lang, section.title)}</h2>
          {section.paragraphs.map((key) => (
            <p key={key} className="mt-3 text-base leading-7 text-slate-200">
              {t(lang, key)}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}

function PublicHeader({ lang }: { lang: Lang }) {
  return (
    <div className="mb-8" dir="ltr">
      <div className="flex justify-end">
        <LanguageSwitch action={setLoginLanguage} lang={lang} returnTo="/privacy" />
      </div>
      <Link href="/" className="mt-2 block text-center text-3xl font-semibold text-white sm:text-4xl">
        {t(lang, "appName")}
      </Link>
    </div>
  );
}

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  if (user?.isActive) {
    const hide = await hidePersonalInfo();
    const lang = user.uiLanguage;
    return (
      <div dir={lang === "he" ? "rtl" : "ltr"}>
        <AppHeader lang={lang} hide={hide} name={user.fullName} role={user.role} path="/privacy" />
        <main className="mx-auto max-w-[1400px] px-4 py-4">
          <PrivacyArticle lang={lang} />
        </main>
      </div>
    );
  }

  const lang = await publicLang(await searchParams);
  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PublicHeader lang={lang} />
        <PrivacyArticle lang={lang} />
      </div>
    </div>
  );
}
