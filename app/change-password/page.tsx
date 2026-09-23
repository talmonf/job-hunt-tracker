import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { changePassword } from "@/lib/actions/auth";
import { passwordActionRequired } from "@/lib/password";
import { t } from "@/lib/i18n";
import { firstParam } from "@/lib/http";
import { Flash } from "@/components/chrome";
import { PasswordFieldLabeled, SubmitButton } from "@/components/widgets";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  const search = await searchParams;
  const lang = user.uiLanguage;
  const forced = passwordActionRequired(user) || session.passwordActionRequired;
  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">{t(lang, "changePassword")}</h1>
      <p className="mt-2 text-sm text-slate-300">{forced ? t(lang, "passwordIntroForced") : t(lang, "passwordIntroVoluntary")}</p>
      <ul className="mt-3 list-disc ps-5 text-sm text-slate-300">
        <li>{t(lang, "ruleLength")}</li>
        <li>{t(lang, "ruleLower")}</li>
        <li>{t(lang, "ruleUpper")}</li>
        <li>{t(lang, "ruleDigit")}</li>
      </ul>
      <Flash lang={lang} search={search} />
      <form action={changePassword} className="mt-4 grid gap-3">
        {user.passwordHash ? (
          <PasswordFieldLabeled name="current" label={t(lang, "currentPassword")} show={t(lang, "show")} hide={t(lang, "hide")} autoComplete="current-password" />
        ) : null}
        <PasswordFieldLabeled name="next" label={t(lang, "newPassword")} show={t(lang, "show")} hide={t(lang, "hide")} autoComplete="new-password" />
        <PasswordFieldLabeled name="confirm" label={t(lang, "confirmPassword")} show={t(lang, "show")} hide={t(lang, "hide")} autoComplete="new-password" />
        <SubmitButton label={t(lang, "save")} />
      </form>
    </div>
  );
}
