import Link from "next/link";
import { setLoginLanguage } from "@/lib/actions/auth";
import { t, type Lang } from "@/lib/i18n";
import { LanguageSwitch } from "./widgets";

export function AuthPageHeader({ lang, returnTo }: { lang: Lang; returnTo: string }) {
  return (
    <div className="mb-6" dir="ltr">
      <div className="flex justify-end">
        <LanguageSwitch action={setLoginLanguage} lang={lang} returnTo={returnTo} />
      </div>
      <Link href="/" className="mt-2 block text-center text-lg font-semibold leading-snug text-white">
        <span className="block" dir="rtl">
          {t("he", "appName")}
        </span>
        <span className="block" dir="ltr">
          {t("en", "appName")}
        </span>
      </Link>
    </div>
  );
}
