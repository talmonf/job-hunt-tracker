import Link from "next/link";
import { setLoginLanguage } from "@/lib/actions/auth";
import { publicLang } from "@/lib/public-lang";
import { AuthForm } from "@/components/auth-form";
import { LanguageSwitch } from "@/components/widgets";
import { googleConfigured } from "@/lib/mail";
import { firstParam } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const lang = await publicLang(search);
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link className="text-lg font-semibold" href="/">
          Job Hunt
        </Link>
        <LanguageSwitch action={setLoginLanguage} lang={lang} returnTo="/signup" />
      </div>
      <AuthForm mode="signup" lang={lang} callbackUrl="/dashboard" google={googleConfigured()} error={firstParam(search.error)} rule={firstParam(search.rule)} />
    </div>
  );
}
