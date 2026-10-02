import { publicLang } from "@/lib/public-lang";
import { AuthForm } from "@/components/auth-form";
import { AuthPageHeader } from "@/components/auth-header";
import { googleConfigured } from "@/lib/mail";
import { firstParam, safeCallback } from "@/lib/http";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const lang = await publicLang(search);
  const callbackUrl = safeCallback(firstParam(search.callbackUrl));
  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} className="mx-auto max-w-md px-4 py-10">
      <AuthPageHeader lang={lang} returnTo={callbackUrl === "/dashboard" ? "/signup" : `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} />
      <AuthForm mode="signup" lang={lang} callbackUrl={callbackUrl} google={googleConfigured()} error={firstParam(search.error)} rule={firstParam(search.rule)} />
    </div>
  );
}
