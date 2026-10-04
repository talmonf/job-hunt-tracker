import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { googleConfigured, smtpConfigured } from "@/lib/mail";
import { t } from "@/lib/i18n";
import { firstParam } from "@/lib/http";
import {
  disconnectCalendar,
  disconnectGoogleContacts,
  importMentme,
  saveDigest,
  saveGoals,
  startCalendarLink,
  startGoogleContactsLink,
} from "@/lib/actions/settings";
import { AiSettings } from "@/components/ai-settings";
import { PageFrame } from "@/components/chrome";
import { SettingsSection } from "@/components/settings-section";
import { TagSettings } from "@/components/tag-settings";
import { SubmitButton, fieldClass, labelClass } from "@/components/widgets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const search = await searchParams;
  const lang = user.uiLanguage;
  const section = firstParam(search.section);
  const [goals, tags, keys, usage, platform, packs, platformGrants] = await Promise.all([
    prisma.userGoals.findUnique({ where: { userId: user.id } }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
    prisma.aiProviderKey.findMany({ where: { userId: user.id }, select: { provider: true, lastFour: true, model: true } }),
    prisma.aiUsage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.aiPlatform.findUnique({ where: { id: "default" } }),
    prisma.creditPack.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.platformKeyGrant.findMany({ where: { userId: user.id }, select: { provider: true } }),
  ]);
  const networkingDaily = goals?.networkingPerDay ?? (goals?.networkingPerWeek != null ? goals.networkingPerWeek / 5 : 0);
  const searchMinutes = goals?.searchMinutesOverride ?? ((goals?.applicationsPerDay ?? 0) + networkingDaily) * 30;
  return (
    <PageFrame lang={lang} title={t(lang, "settings")} description={t(lang, "settingsIntro")} search={search}>
      <SettingsSection title={t(lang, "importExport")}>
        <form action={importMentme} encType="multipart/form-data" className="flex flex-wrap items-end gap-3">
          <label>
            <span className={labelClass}>{t(lang, "importFile")}</span>
            <input name="file" type="file" accept=".xlsx" required />
          </label>
          <SubmitButton label={t(lang, "importAction")} />
        </form>
        <a className="mt-3 inline-block text-sm text-sky-300" href="/api/export">
          {t(lang, "exportAction")}
        </a>
      </SettingsSection>

      <SettingsSection id="google" defaultOpen={section === "google"} title={t(lang, "linkGoogle")}>
        <h3 className="mb-2 text-base">{t(lang, "calendar")}</h3>
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
        <h3 className="mb-2 mt-6 text-base">{t(lang, "googleContacts")}</h3>
        {googleConfigured() ? (
          user.contactsRefreshToken ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>
                {t(lang, "googleContactsLinked")}: {user.contactsEmail || "Google"}
              </span>
              <form action={disconnectGoogleContacts}>
                <button className="text-rose-300" type="submit">{t(lang, "disconnectGoogleContacts")}</button>
              </form>
            </div>
          ) : (
            <form action={startGoogleContactsLink}>
              <p className="mb-2 text-sm text-slate-300">{t(lang, "googleContactsHint")}</p>
              <SubmitButton label={t(lang, "linkGoogleContacts")} />
            </form>
          )
        ) : (
          <p className="text-sm text-slate-300">{t(lang, "googleContactsMissing")}</p>
        )}
      </SettingsSection>

      <SettingsSection title={t(lang, "goals")}>
        <form action={saveGoals} className="grid gap-3 md:grid-cols-2">
          <NumberField name="applicationsPerDay" label={t(lang, "applicationsPerDay")} defaultValue={goals?.applicationsPerDay ?? 0} />
          <NumberField name="networkingPerDay" label={t(lang, "networkingPerDay")} defaultValue={goals?.networkingPerDay ?? ""} />
          <NumberField name="networkingPerWeek" label={t(lang, "networkingPerWeek")} defaultValue={goals?.networkingPerWeek ?? ""} />
          <NumberField name="interviewPracticeMinutesPerDay" label={t(lang, "practiceMinutes")} defaultValue={goals?.interviewPracticeMinutesPerDay ?? 0} />
          <NumberField name="learningMinutesPerDay" label={t(lang, "learningMinutes")} defaultValue={goals?.learningMinutesPerDay ?? 0} />
          <NumberField name="searchMinutesOverride" label={t(lang, "searchOverride")} defaultValue={goals?.searchMinutesOverride ?? ""} />
          <p className="text-sm text-slate-300 md:col-span-2">
            {t(lang, "searchFormula")}: {Math.round(searchMinutes)} {t(lang, "minutesPerDay")}
          </p>
          <div className="md:col-span-2">
            <SubmitButton label={t(lang, "save")} />
          </div>
        </form>
      </SettingsSection>

      <SettingsSection title={t(lang, "emailDigest")}>
        <form action={saveDigest} className="grid gap-3 md:grid-cols-2">
          {!smtpConfigured() ? <p className="text-sm text-amber-200 md:col-span-2">{t(lang, "smtpOff")}</p> : null}
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="digestEnabled" value="1" defaultChecked={user.digestEnabled} />
            {t(lang, "digestEnabled")}
          </label>
          <NumberField name="digestDaysAhead" label={t(lang, "digestDays")} defaultValue={user.digestDaysAhead} />
          <NumberField name="digestHour" label={t(lang, "digestHour")} defaultValue={user.digestHour} />
          <div className="md:col-span-2">
            <SubmitButton label={t(lang, "save")} />
          </div>
        </form>
      </SettingsSection>

      <TagSettings lang={lang} tags={tags} open={section === "tags"} />

      <AiSettings
        lang={lang}
        paySource={user.aiPaySource}
        balanceAgorot={user.creditBalance}
        keys={keys}
        usage={usage}
        isAdmin={user.role === "admin"}
        markupPercent={platform?.markupPercent ?? 20}
        usdToIls={platform?.usdToIls ?? 3.7}
        packs={packs}
        stripeReady={Boolean(process.env.STRIPE_SECRET_KEY && process.env.AUTH_URL)}
        platformGrants={platformGrants.map((grant) => grant.provider)}
      />
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
