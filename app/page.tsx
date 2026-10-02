import { googleConfigured } from "@/lib/mail";
import { splashFeatures, t } from "@/lib/i18n";
import { firstParam } from "@/lib/http";
import { publicLang } from "@/lib/public-lang";
import { SplashActions } from "@/components/splash-actions";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const lang = await publicLang(search);
  const requested = firstParam(search.panel);
  const panel = requested === "login" || requested === "signup" ? requested : null;
  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <SplashActions lang={lang} google={googleConfigured()} error={firstParam(search.error)} rule={firstParam(search.rule)} initialPanel={panel} />
        <article className="mt-8 rounded-xl bg-slate-900 p-5 ring-1 ring-slate-800">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{t(lang, "splashTitle")}</h2>
          <p className="mt-3 text-base leading-7 text-slate-200">{t(lang, "splashBody")}</p>
          <p className="mt-3 text-base leading-7 text-slate-200">{t(lang, "splashBody2")}</p>
          <h3 className="mt-6 text-lg font-semibold text-white">{t(lang, "splashListTitle")}</h3>
          <ul className="mt-3 list-disc space-y-2 ps-5 text-base leading-7 text-slate-200">
            {splashFeatures[lang].map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}
