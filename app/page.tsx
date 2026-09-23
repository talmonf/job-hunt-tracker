import Link from "next/link";
import { setLoginLanguage } from "@/lib/actions/auth";
import { googleConfigured } from "@/lib/mail";
import { t } from "@/lib/i18n";
import { firstParam } from "@/lib/http";
import { publicLang } from "@/lib/public-lang";
import { AuthForm } from "@/components/auth-form";
import { LanguageSwitch } from "@/components/widgets";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const lang = await publicLang(search);
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="text-lg font-semibold">Job Hunt · חיפוש עבודה</span>
        <div className="flex items-center gap-3">
          <LanguageSwitch action={setLoginLanguage} lang={lang} returnTo={queryPath("/", search)} />
          <Link className="text-sm text-sky-300" href="/login">
            {t(lang, "signIn")}
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 md:grid-cols-2">
        <article dir="ltr" className="rounded-xl bg-slate-900 p-5 ring-1 ring-slate-800">
          <h1 className="text-3xl font-semibold text-white">{t("en", "splashTitle")}</h1>
          <p className="mt-4 text-slate-200">{t("en", "splashBody")}</p>
          <p className="mt-3 text-slate-200">{t("en", "splashBody2")}</p>
          <p className="mt-4 text-sm text-slate-400">{t("en", "splashSignIn")}</p>
        </article>
        <article dir="rtl" className="rounded-xl bg-slate-900 p-5 text-right ring-1 ring-slate-800">
          <h1 className="text-3xl font-semibold text-white">{t("he", "splashTitle")}</h1>
          <p className="mt-4 text-slate-200">{t("he", "splashBody")}</p>
          <p className="mt-3 text-slate-200">{t("he", "splashBody2")}</p>
          <p className="mt-4 text-sm text-slate-400">{t("he", "splashSignIn")}</p>
        </article>
      </div>
      <AuthForm mode="login" lang={lang} callbackUrl="/dashboard" google={googleConfigured()} error={firstParam(search.error)} rule={firstParam(search.rule)} />
    </div>
  );
}

function queryPath(path: string, search: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (key === "lang") continue;
    const list = Array.isArray(value) ? value : value ? [value] : [];
    for (const item of list) params.append(key, item);
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}
