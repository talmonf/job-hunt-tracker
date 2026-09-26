import { googleConfigured } from "@/lib/mail";
import { t } from "@/lib/i18n";
import { firstParam } from "@/lib/http";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 md:grid-cols-2">
        <section dir="ltr">
          <h1 className="text-center text-3xl font-semibold text-white sm:text-4xl">Job Hunt Tracker</h1>
          <article className="mt-6 rounded-xl bg-slate-900 p-5 ring-1 ring-slate-800">
            <h2 className="text-3xl font-semibold text-white">{t("en", "splashTitle")}</h2>
            <p className="mt-4 text-slate-200">{t("en", "splashBody")}</p>
            <p className="mt-3 text-slate-200">{t("en", "splashBody2")}</p>
            <p className="mt-4 text-sm text-slate-400">{t("en", "splashSignIn")}</p>
          </article>
        </section>
        <section dir="rtl">
          <h1 className="text-center text-3xl font-semibold text-white sm:text-4xl">מעקב חיפוש עבודה</h1>
          <article className="mt-6 rounded-xl bg-slate-900 p-5 text-right ring-1 ring-slate-800">
            <h2 className="text-3xl font-semibold text-white">{t("he", "splashTitle")}</h2>
            <p className="mt-4 text-slate-200">{t("he", "splashBody")}</p>
            <p className="mt-3 text-slate-200">{t("he", "splashBody2")}</p>
            <p className="mt-4 text-sm text-slate-400">{t("he", "splashSignIn")}</p>
          </article>
        </section>
      </div>
      <AuthForm mode="login" lang="en" fixedLanguage callbackUrl="/dashboard" google={googleConfigured()} error={firstParam(search.error)} rule={firstParam(search.rule)} />
    </div>
  );
}
