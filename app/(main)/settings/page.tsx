import type { TagColor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { googleConfigured, smtpConfigured } from "@/lib/mail";
import { t } from "@/lib/i18n";
import { firstParam } from "@/lib/http";
import {
  disconnectCalendar,
  disconnectGoogleContacts,
  importMentme,
  saveSettings,
  startCalendarLink,
  startGoogleContactsLink,
} from "@/lib/actions/settings";
import { createTag, deleteTag, updateTag } from "@/lib/actions/tags";
import { TAG_COLORS, TAG_SWATCH_CLASS } from "@/lib/tags";
import { PageFrame } from "@/components/chrome";
import { ConfirmSubmit, SubmitButton, fieldClass, labelClass } from "@/components/widgets";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const search = await searchParams;
  const lang = user.uiLanguage;
  const [goals, tags] = await Promise.all([
    prisma.userGoals.findUnique({ where: { userId: user.id } }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  const networkingDaily = goals?.networkingPerDay ?? (goals?.networkingPerWeek != null ? goals.networkingPerWeek / 5 : 0);
  const searchMinutes = goals?.searchMinutesOverride ?? ((goals?.applicationsPerDay ?? 0) + networkingDaily) * 30;
  return (
    <PageFrame lang={lang} title={t(lang, "settings")} description={t(lang, "settingsIntro")} search={search}>
      <h2 className="mb-1 text-lg">{t(lang, "tags")}</h2>
      <p className="mb-3 text-sm text-slate-400">{t(lang, "tagsIntro")}</p>
      <ul className="mb-4 space-y-3">
        {tags.map((tag) => (
          <li key={tag.id} className="flex flex-wrap items-end gap-3 rounded-md border border-slate-700 p-3">
            <form action={updateTag} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={tag.id} />
              <label>
                <span className={labelClass}>{t(lang, "tagName")}</span>
                <input className={fieldClass} name="name" defaultValue={tag.name} required />
              </label>
              <ColorSwatches legend={t(lang, "tagColor")} selected={tag.color} />
              <SubmitButton label={t(lang, "save")} />
            </form>
            <ConfirmSubmit action={deleteTag} message={t(lang, "deleteTagConfirm")} label={t(lang, "delete")} className="text-sm text-rose-300">
              <input type="hidden" name="id" value={tag.id} />
            </ConfirmSubmit>
          </li>
        ))}
      </ul>
      <form action={createTag} className="mb-8 flex flex-wrap items-end gap-3">
        <label>
          <span className={labelClass}>{t(lang, "addTag")}</span>
          <input className={fieldClass} name="name" required />
        </label>
        <ColorSwatches legend={t(lang, "tagColor")} selected="sky" />
        <SubmitButton label={t(lang, "add")} />
      </form>

      <h2 className="mb-2 text-lg">{t(lang, "importExport")}</h2>
      <form action={importMentme} encType="multipart/form-data" className="flex flex-wrap items-end gap-3">
        <label>
          <span className={labelClass}>{t(lang, "importFile")}</span>
          <input name="file" type="file" accept=".xlsx" required />
        </label>
        <SubmitButton label={t(lang, "importAction")} />
      </form>
      {firstParam(search.jobs) ? null : null}
      <a className="mt-3 inline-block text-sm text-sky-300" href="/api/export">
        {t(lang, "exportAction")}
      </a>

      <form action={saveSettings} className="mt-8 grid gap-3 md:grid-cols-2">
        <h2 className="text-lg md:col-span-2">{t(lang, "goals")}</h2>
        <NumberField name="applicationsPerDay" label={t(lang, "applicationsPerDay")} defaultValue={goals?.applicationsPerDay ?? 0} />
        <NumberField name="networkingPerDay" label={t(lang, "networkingPerDay")} defaultValue={goals?.networkingPerDay ?? ""} />
        <NumberField name="networkingPerWeek" label={t(lang, "networkingPerWeek")} defaultValue={goals?.networkingPerWeek ?? ""} />
        <NumberField name="interviewPracticeMinutesPerDay" label={t(lang, "practiceMinutes")} defaultValue={goals?.interviewPracticeMinutesPerDay ?? 0} />
        <NumberField name="learningMinutesPerDay" label={t(lang, "learningMinutes")} defaultValue={goals?.learningMinutesPerDay ?? 0} />
        <NumberField name="searchMinutesOverride" label={t(lang, "searchOverride")} defaultValue={goals?.searchMinutesOverride ?? ""} />
        <p className="md:col-span-2 text-sm text-slate-300">
          {t(lang, "searchFormula")}: {Math.round(searchMinutes)} {t(lang, "minutesPerDay")}
        </p>
        <h2 className="mt-4 text-lg md:col-span-2">{t(lang, "emailDigest")}</h2>
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

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "googleContacts")}</h2>
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
    </PageFrame>
  );
}

function ColorSwatches({ legend, selected }: { legend: string; selected: TagColor }) {
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {TAG_COLORS.map((color) => (
          <label key={color} className="cursor-pointer">
            <input className="peer sr-only" type="radio" name="color" value={color} defaultChecked={color === selected} required aria-label={color} />
            <span
              className={`block h-6 w-6 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-slate-950 peer-checked:ring-white peer-focus-visible:ring-slate-300 ${TAG_SWATCH_CLASS[color]}`}
            />
          </label>
        ))}
      </div>
    </fieldset>
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
