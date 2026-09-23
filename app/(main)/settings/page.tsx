import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { googleConfigured, smtpConfigured } from "@/lib/mail";
import { t } from "@/lib/i18n";
import { firstParam } from "@/lib/http";
import { disconnectCalendar, importMentme, saveDigest, saveGoals, startCalendarLink } from "@/lib/actions/settings";
import { PageFrame } from "@/components/chrome";
import { SubmitButton, fieldClass, labelClass } from "@/components/widgets";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const search = await searchParams;
  const lang = user.uiLanguage;
  const goals = await prisma.userGoals.findUnique({ where: { userId: user.id } });
  const networkingDaily = goals?.networkingPerDay ?? (goals?.networkingPerWeek != null ? goals.networkingPerWeek / 5 : 0);
  const searchMinutes = goals?.searchMinutesOverride ?? ((goals?.applicationsPerDay ?? 0) + networkingDaily) * 30;
  return (
    <PageFrame lang={lang} title={t(lang, "settings")} description={t(lang, "settingsIntro")} search={search}>
      <h2 className="text-lg">{t(lang, "goals")}</h2>
      <form action={saveGoals} className="mt-3 grid gap-3 md:grid-cols-2">
        <NumberField name="applicationsPerDay" label={t(lang, "applicationsPerDay")} defaultValue={goals?.applicationsPerDay ?? 0} />
        <NumberField name="networkingPerDay" label={t(lang, "networkingPerDay")} defaultValue={goals?.networkingPerDay ?? ""} />
        <NumberField name="networkingPerWeek" label={t(lang, "networkingPerWeek")} defaultValue={goals?.networkingPerWeek ?? ""} />
        <NumberField name="interviewPracticeMinutesPerDay" label={t(lang, "practiceMinutes")} defaultValue={goals?.interviewPracticeMinutesPerDay ?? 0} />
        <NumberField name="learningMinutesPerDay" label={t(lang, "learningMinutes")} defaultValue={goals?.learningMinutesPerDay ?? 0} />
        <NumberField name="searchMinutesOverride" label={t(lang, "searchOverride")} defaultValue={goals?.searchMinutesOverride ?? ""} />
        <p className="md:col-span-2 text-sm text-slate-300">
          {t(lang, "searchFormula")}: {Math.round(searchMinutes)} {t(lang, "minutesPerDay")}
        </p>
        <SubmitButton label={t(lang, "save")} />
      </form>

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "calendar")}</h2>
      {googleConfigured() ? (
        user.calendarRefreshToken ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              {t(lang, "calendarLinked")}: {user.calendarEmail || "Google"}
            </span>
            <form action={disconnectCalendar}>
              <button className="text-rose-300" type="submit">{t(lang, "disconnectCalendar")}</button>
            </form>
          </div>
        ) : (
          <form action={startCalendarLink}>
            <p className="mb-2 text-sm text-slate-300">{t(lang, "calendarHint")}</p>
            <SubmitButton label={t(lang, "linkCalendar")} />
          </form>
        )
      ) : (
        <p className="text-sm text-slate-300">{t(lang, "calendarMissing")}</p>
      )}

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "emailDigest")}</h2>
      {!smtpConfigured() ? <p className="mb-2 text-sm text-amber-200">{t(lang, "smtpOff")}</p> : null}
      <form action={saveDigest} className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="digestEnabled" value="1" defaultChecked={user.digestEnabled} />
          {t(lang, "digestEnabled")}
        </label>
        <NumberField name="digestDaysAhead" label={t(lang, "digestDays")} defaultValue={user.digestDaysAhead} />
        <NumberField name="digestHour" label={t(lang, "digestHour")} defaultValue={user.digestHour} />
        <SubmitButton label={t(lang, "save")} />
      </form>

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "importExport")}</h2>
      <form action={importMentme} className="flex flex-wrap items-end gap-3">
        <label>
          <span className={labelClass}>{t(lang, "importFile")}</span>
          <input name="file" type="file" accept=".xlsx" />
        </label>
        <SubmitButton label={t(lang, "importAction")} />
      </form>
      {firstParam(search.jobs) ? null : null}
      <a className="mt-3 inline-block text-sm text-sky-300" href="/api/export">
        {t(lang, "exportAction")}
      </a>
    </PageFrame>
  );
}

function NumberField({ name, label, defaultValue }: { name: string; label: string; defaultValue: number | string }) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input className={fieldClass} name={name} defaultValue={defaultValue} inputMode="decimal" />
    </label>
  );
}
