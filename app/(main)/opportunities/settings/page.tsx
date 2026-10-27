import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { t } from "@/lib/i18n";
import { firstParam } from "@/lib/http";
import { googleConfigured } from "@/lib/mail";
import { PageFrame } from "@/components/chrome";
import { SubmitButton, fieldClass, labelClass } from "@/components/widgets";
import { addBoard, disconnectGmail, saveSearchSettings, setBoardEnabled, startGmailLink } from "@/lib/actions/search";
import { loadInbox } from "@/lib/search/inbox";
import { formatDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

const REGIONS = [
  ["regionTelAviv", "regionTelAviv"],
  ["regionSharon", "regionSharon"],
  ["regionCenter", "regionCenter"],
  ["regionJerusalem", "regionJerusalem"],
  ["regionJudea", "regionJudea"],
  ["regionSouth", "regionSouth"],
  ["regionNorth", "regionNorth"],
] as const;

export default async function SearchSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!user.jobSearchEnabled) redirect("/dashboard");
  const search = await searchParams;
  const lang = user.uiLanguage;
  const data = await loadInbox(user.id);
  const settings = data.settings;
  const error = firstParam(search.error);

  return (
    <PageFrame lang={lang} backHref="/opportunities" title={t(lang, "searchSettings")} description={t(lang, "searchSettingsIntro")}>
      {firstParam(search.updated) ? <p className="mb-3 rounded-md border border-green-700 px-3 py-2 text-sm text-green-200">{t(lang, "updated")}</p> : null}
      {error === "board" ? <p className="mb-3 text-sm text-rose-200">{t(lang, "errorBoard")}</p> : null}
      {error === "gmail" ? <p className="mb-3 text-sm text-rose-200">{t(lang, "errorGmail")}</p> : null}
      {error === "gmail-scope" ? <p className="mb-3 text-sm text-rose-200">{t(lang, "gmailScope")}</p> : null}
      <form action={saveSearchSettings} className="space-y-4">
        <label className="block">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className={labelClass}>{t(lang, "searchTerms")}</span>
            <span className="text-[11px] italic text-slate-500">{t(lang, "termsHint")}</span>
          </span>
          <textarea className={fieldClass} name="terms" rows={4} defaultValue={settings.terms} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="flex flex-wrap items-baseline gap-2">
              <span className={labelClass}>{t(lang, "excludedTitle")}</span>
              <span className="text-[11px] italic text-slate-500">{t(lang, "listHint")}</span>
            </span>
            <textarea className={fieldClass} name="excludedTitle" rows={4} defaultValue={settings.excludedTitle} />
          </label>
          <label>
            <span className="flex flex-wrap items-baseline gap-2">
              <span className={labelClass}>{t(lang, "excludedDescription")}</span>
              <span className="text-[11px] italic text-slate-500">{t(lang, "descriptionHint")}</span>
            </span>
            <textarea className={fieldClass} name="excludedDescription" rows={4} defaultValue={settings.excludedDescription} />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label>
            <span className={labelClass}>{t(lang, "maxAgeDays")}</span>
            <input className="w-24 rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" name="maxAgeDays" type="number" min={1} max={90} defaultValue={settings.maxAgeDays} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hideJunior" value="1" defaultChecked={settings.hideJunior} />
            {t(lang, "hideJunior")}
          </label>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm text-slate-200">{t(lang, "regions")}</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {REGIONS.map(([name, key]) => (
              <label key={name} className="flex items-center gap-2">
                <input type="checkbox" name={name} value="1" defaultChecked={Boolean(settings[name])} />
                {t(lang, key)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className={labelClass}>{t(lang, "extraPlaces")}</span>
            <span className="text-[11px] italic text-slate-500">{t(lang, "extraPlacesHint")}</span>
          </span>
          <input className={fieldClass} name="extraPlaces" defaultValue={settings.extraPlaces} />
        </label>
        <label className="block">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className={labelClass}>{t(lang, "alertSenders")}</span>
            <span className="text-[11px] italic text-slate-500">{t(lang, "alertSendersHint")}</span>
          </span>
          <textarea className={fieldClass} name="alertSenders" rows={4} defaultValue={settings.alertSenders} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className={labelClass}>{t(lang, "confirmPhrases")}</span>
            <textarea className={fieldClass} name="confirmPhrases" rows={5} defaultValue={settings.confirmPhrases} />
          </label>
          <label>
            <span className={labelClass}>{t(lang, "rejectPhrases")}</span>
            <textarea className={fieldClass} name="rejectPhrases" rows={5} defaultValue={settings.rejectPhrases} />
          </label>
        </div>
        <SubmitButton label={t(lang, "save")} />
      </form>

      <section className="mt-8">
        <h2 className="mb-2 text-lg text-white">{t(lang, "gmail")}</h2>
        {data.gmailEmail ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>{t(lang, "gmailLinked")}: {data.gmailEmail}</span>
            <form action={disconnectGmail}>
              <button className="text-rose-300" type="submit">{t(lang, "disconnectGmail")}</button>
            </form>
          </div>
        ) : googleConfigured() ? (
          <form action={startGmailLink}>
            <p className="mb-2 text-sm text-slate-300">{t(lang, "gmailHint")}</p>
            <SubmitButton label={t(lang, "connectGmail")} />
          </form>
        ) : (
          <p className="text-sm text-slate-400">{t(lang, "errorGmail")}</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg text-white">{t(lang, "boards")}</h2>
        <form action={addBoard} className="mb-4 flex flex-wrap items-end gap-3">
          <label>
            <span className="flex flex-wrap items-baseline gap-2">
              <span className={labelClass}>{t(lang, "boardUrl")}</span>
              <span className="text-[11px] italic text-slate-500">{t(lang, "boardUrlHint")}</span>
            </span>
            <input className="w-80 max-w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm" name="url" type="url" required />
          </label>
          <SubmitButton label={t(lang, "add")} />
        </form>
        <ul className="space-y-2 text-sm">
          {data.boards.map((board) => (
            <li key={board.id} className="flex flex-wrap items-center gap-3 border-t border-slate-800 py-2">
              <form action={setBoardEnabled}>
                <input type="hidden" name="boardId" value={board.id} />
                <input type="hidden" name="enabled" value={board.enabled ? "0" : "1"} />
                <button className="text-sky-300" type="submit">{board.enabled ? t(lang, "turnOff") : t(lang, "turnOn")}</button>
              </form>
              <span className="text-white">{board.companyName}</span>
              <span className="text-slate-400">{board.provider}</span>
              {board.lastFetchedAt ? <span className="text-slate-500">{formatDateTime(new Date(board.lastFetchedAt), user.timezone)}</span> : null}
              {board.lastError ? <span className="text-rose-300">{board.lastError}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </PageFrame>
  );
}
