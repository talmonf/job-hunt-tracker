import type { AiPaySource, AiProvider } from "@prisma/client";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { AI_PROVIDERS, DEFAULT_MODEL, isAiProvider, platformKey } from "@/lib/ai/providers";
import { paySourceLabel } from "@/lib/ai/labels";
import { platformGrantAllows } from "@/lib/ai/platform-access";
import { formatIls } from "@/lib/ai/money";
import {
  deleteCreditPack,
  deleteProviderKey,
  saveCreditPack,
  savePaySource,
  savePlatformPricing,
  saveProviderKey,
  startCreditCheckout,
  testProviderKey,
} from "@/lib/actions/ai";
import { SettingsSection } from "@/components/settings-section";
import { SubmitButton, fieldClass, labelClass } from "@/components/widgets";

type KeyRow = { provider: AiProvider; lastFour: string; model: string };
type UsageRow = {
  id: string;
  feature: string;
  provider: AiProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  paySource: AiPaySource;
  estimatedAgorot: number;
  debitAgorot: number;
  createdAt: Date;
};
type Pack = { id: string; nameEn: string; nameHe: string; creditAgorot: number; priceAgorot: number; active: boolean };

export function AiSettings({
  lang,
  paySource,
  balanceAgorot,
  keys,
  usage,
  isAdmin,
  markupPercent,
  usdToIls,
  packs,
  stripeReady,
  platformGrants,
}: {
  lang: Lang;
  paySource: AiPaySource;
  balanceAgorot: number;
  keys: KeyRow[];
  usage: UsageRow[];
  isAdmin: boolean;
  markupPercent: number;
  usdToIls: number;
  packs: Pack[];
  stripeReady: boolean;
  platformGrants: string[];
}) {
  const saved = new Map(keys.map((row) => [row.provider, row]));
  const creditsReady = platformGrants.some((provider) => isAiProvider(provider) && platformKey(provider));
  const configured = keys.length > 0 || (paySource === "credits" && creditsReady);
  return (
    <SettingsSection
      title={t(lang, "aiTitle")}
      badge={configured ? t(lang, "aiConfigured") : t(lang, "aiNotConfigured")}
      badgeClassName={configured ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-200"}
    >
      <p className="mb-3 text-sm text-slate-400">{t(lang, "aiIntro")}</p>
      <p className="mb-3 text-sm">{t(lang, "balance")}: {formatIls(balanceAgorot)}</p>
      <form action={savePaySource} className="mb-4 flex flex-wrap items-end gap-3">
        <label>
          <span className={labelClass}>{t(lang, "paySource")}</span>
          <select className={fieldClass} name="paySource" defaultValue={paySource}>
            <option value="key">{t(lang, "payWithKey")}</option>
            <option value="credits">{t(lang, "payWithCredits")}</option>
          </select>
        </label>
        <SubmitButton label={t(lang, "save")} />
      </form>
      <div className="grid gap-4">
        {AI_PROVIDERS.map((provider) => {
          const row = saved.get(provider);
          return (
            <div key={provider} className="rounded-md border border-slate-700 p-3">
              <div className="mb-2 text-sm font-medium">{provider}</div>
              <form action={saveProviderKey} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="provider" value={provider} />
                <label>
                  <span className={labelClass}>{t(lang, "apiKey")}</span>
                  <input className={fieldClass} name="apiKey" type="password" autoComplete="off" placeholder={row ? `••••${row.lastFour}` : ""} />
                </label>
                <label>
                  <span className={labelClass}>{t(lang, "model")}</span>
                  <input className={fieldClass} name="model" defaultValue={row?.model || DEFAULT_MODEL[provider]} />
                </label>
                <SubmitButton label={t(lang, "save")} />
              </form>
              <p className="mt-2 text-xs text-slate-400">
                {row ? `${t(lang, "keySaved")} ••••${row.lastFour}` : t(lang, "keyMissing")}
                {platformGrantAllows(provider, platformGrants)
                  ? ` · ${platformKey(provider) ? t(lang, "platformReady") : t(lang, "platformMissing")}`
                  : ""}
              </p>
              <div className="mt-2 flex gap-3">
                <form action={testProviderKey}>
                  <input type="hidden" name="provider" value={provider} />
                  <input type="hidden" name="paySource" value={paySource} />
                  <button className="text-sm text-sky-300" type="submit">{t(lang, "testKey")}</button>
                </form>
                {row ? (
                  <form action={deleteProviderKey}>
                    <input type="hidden" name="provider" value={provider} />
                    <button className="text-sm text-rose-300" type="submit">{t(lang, "delete")}</button>
                  </form>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {packs.filter((pack) => pack.active).length ? (
        <div className="mt-4">
          <h3 className="mb-2 text-base">{t(lang, "buyCredits")}</h3>
          {!stripeReady ? <p className="mb-2 text-sm text-amber-200">{t(lang, "errorStripe")}</p> : null}
          <div className="flex flex-wrap gap-2">
            {packs.filter((pack) => pack.active).map((pack) => (
              <form key={pack.id} action={startCreditCheckout}>
                <input type="hidden" name="packId" value={pack.id} />
                <button className="rounded-md border border-slate-600 px-3 py-2 text-sm" type="submit" disabled={!stripeReady}>
                  {lang === "he" ? pack.nameHe : pack.nameEn}: {formatIls(pack.creditAgorot)} / {formatIls(pack.priceAgorot)}
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
      <h3 className="mb-2 mt-6 text-base">{t(lang, "usage")}</h3>
      {usage.length === 0 ? <p className="text-sm text-slate-400">{t(lang, "usageEmpty")}</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-start text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="px-2 py-1">{t(lang, "when")}</th>
                <th className="px-2 py-1">{t(lang, "feature")}</th>
                <th className="px-2 py-1">{t(lang, "provider")}</th>
                <th className="px-2 py-1">{t(lang, "model")}</th>
                <th className="px-2 py-1">{t(lang, "tokens")}</th>
                <th className="px-2 py-1">{t(lang, "paySource")}</th>
                <th className="px-2 py-1">{t(lang, "estimatedCost")}</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-2 py-1">{row.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="px-2 py-1">{row.feature}</td>
                  <td className="px-2 py-1">{row.provider}</td>
                  <td className="px-2 py-1">{row.model}</td>
                  <td className="px-2 py-1">{row.inputTokens} / {row.outputTokens}</td>
                  <td className="px-2 py-1">{paySourceLabel(lang, row.paySource)}</td>
                  <td className="px-2 py-1">{row.paySource === "credits" ? formatIls(row.debitAgorot) : formatIls(row.estimatedAgorot)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isAdmin ? (
        <div className="mt-6 grid gap-3">
          <h3 className="text-base">{t(lang, "platformPricing")}</h3>
          <form action={savePlatformPricing} className="flex flex-wrap items-end gap-3">
            <label>
              <span className={labelClass}>{t(lang, "markup")}</span>
              <input className={fieldClass} name="markupPercent" defaultValue={markupPercent} inputMode="numeric" />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "usdToIls")}</span>
              <input className={fieldClass} name="usdToIls" defaultValue={usdToIls} inputMode="decimal" />
            </label>
            <SubmitButton label={t(lang, "save")} />
          </form>
          <h3 className="text-base">{t(lang, "creditPacks")}</h3>
          {packs.map((pack) => (
            <form key={pack.id} action={saveCreditPack} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={pack.id} />
              <label><span className={labelClass}>{t(lang, "packNameEn")}</span><input className={fieldClass} name="nameEn" defaultValue={pack.nameEn} required /></label>
              <label><span className={labelClass}>{t(lang, "packNameHe")}</span><input className={fieldClass} name="nameHe" defaultValue={pack.nameHe} /></label>
              <label><span className={labelClass}>{t(lang, "creditAmount")}</span><input className={fieldClass} name="creditIls" defaultValue={(pack.creditAgorot / 100).toFixed(2)} required /></label>
              <label><span className={labelClass}>{t(lang, "priceAmount")}</span><input className={fieldClass} name="priceIls" defaultValue={(pack.priceAgorot / 100).toFixed(2)} required /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" value="1" defaultChecked={pack.active} /> {t(lang, "active")}</label>
              <SubmitButton label={t(lang, "save")} />
              <button className="text-sm text-rose-300" type="submit" form={`delete-pack-${pack.id}`}>{t(lang, "delete")}</button>
            </form>
          ))}
          {packs.map((pack) => (
            <form key={`delete-${pack.id}`} id={`delete-pack-${pack.id}`} action={deleteCreditPack}>
              <input type="hidden" name="id" value={pack.id} />
            </form>
          ))}
          <form action={saveCreditPack} className="flex flex-wrap items-end gap-3">
            <label><span className={labelClass}>{t(lang, "packNameEn")}</span><input className={fieldClass} name="nameEn" required /></label>
            <label><span className={labelClass}>{t(lang, "packNameHe")}</span><input className={fieldClass} name="nameHe" /></label>
            <label><span className={labelClass}>{t(lang, "creditAmount")}</span><input className={fieldClass} name="creditIls" required /></label>
            <label><span className={labelClass}>{t(lang, "priceAmount")}</span><input className={fieldClass} name="priceIls" required /></label>
            <input type="hidden" name="active" value="1" />
            <SubmitButton label={t(lang, "add")} />
          </form>
        </div>
      ) : null}
    </SettingsSection>
  );
}
