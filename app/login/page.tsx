import { googleConfigured } from "@/lib/mail";
import { firstParam, safeCallback } from "@/lib/http";
import { AuthForm } from "@/components/auth-form";
import { publicLang } from "@/lib/public-lang";
import { LanguageSwitch } from "@/components/widgets";
import { setLoginLanguage } from "@/lib/actions/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const lang = await publicLang(search);
  const callbackUrl = safeCallback(firstParam(search.callbackUrl));
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link className="text-lg font-semibold" href="/">
          Job Hunt
        </Link>
        <LanguageSwitch action={setLoginLanguage} lang={lang} returnTo={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} />
      </div>
      <AuthForm mode="login" lang={lang} callbackUrl={callbackUrl} google={googleConfigured()} error={firstParam(search.error)} rule={firstParam(search.rule)} />
    </div>
  );
}
