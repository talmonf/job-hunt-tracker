import Link from "next/link";
import { t } from "@/lib/i18n";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
        <div className="order-1 mx-auto flex w-full max-w-md flex-col gap-3 md:order-3 md:col-span-2 md:max-w-xl md:flex-row">
          <Link className="flex-1 rounded-lg bg-sky-500 px-4 py-3 text-center text-base font-semibold text-slate-950 hover:bg-sky-400" href="/login">
            Login
            <span className="mt-0.5 block text-sm font-medium">כניסה</span>
          </Link>
          <Link className="flex-1 rounded-lg border border-slate-600 px-4 py-3 text-center text-base font-semibold text-slate-100 hover:bg-slate-800" href="/signup">
            Create Account
            <span className="mt-0.5 block text-sm font-medium text-slate-300">יצירת חשבון</span>
          </Link>
        </div>
        <section dir="rtl" className="order-2">
          <h1 className="text-center text-2xl font-semibold text-white sm:text-4xl">מעקב חיפוש עבודה</h1>
          <article className="mt-4 rounded-xl bg-slate-900 p-5 text-right ring-1 ring-slate-800">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">{t("he", "splashTitle")}</h2>
            <p className="mt-3 text-base leading-7 text-slate-200">{t("he", "splashBody")}</p>
            <p className="mt-3 text-base leading-7 text-slate-200">{t("he", "splashBody2")}</p>
          </article>
        </section>
        <section dir="ltr" className="order-3 md:order-1">
          <h1 className="text-center text-2xl font-semibold text-white sm:text-4xl">Job Hunt Tracker</h1>
          <article className="mt-4 rounded-xl bg-slate-900 p-5 ring-1 ring-slate-800">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">{t("en", "splashTitle")}</h2>
            <p className="mt-3 text-base leading-7 text-slate-200">{t("en", "splashBody")}</p>
            <p className="mt-3 text-base leading-7 text-slate-200">{t("en", "splashBody2")}</p>
          </article>
        </section>
      </div>
    </div>
  );
}
