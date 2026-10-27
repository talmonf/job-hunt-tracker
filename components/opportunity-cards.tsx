import { statusLabel, t, type Lang, type MessageKey } from "@/lib/i18n";
import { decidePosting } from "@/lib/actions/search";
import type { OpportunityCard } from "@/lib/search/inbox";
import type { Freshness, Level, RuleKey } from "@/lib/search/rules";

const LEVEL_KEY: Record<Level, MessageKey> = {
  lead: "levelLead",
  engineer: "levelEngineer",
  above: "levelAbove",
  other: "levelOther",
};

const FRESH_KEY: Record<Freshness, MessageKey> = {
  fresh: "fresh",
  aging: "aging",
  updated: "freshnessUpdated",
  older: "freshnessOlder",
  unknown: "freshnessUnknown",
};

const WAIVE_KEY: Record<RuleKey, MessageKey> = {
  excluded: "ruleExcluded",
  description: "ruleDescription",
  region: "ruleRegion",
  unknown_location: "ruleUnknown",
  outside_israel: "ruleOutside",
  age: "ruleAge",
  junior: "ruleJunior",
  known: "ruleKnown",
};

export function OpportunityCards({ lang, cards }: { lang: Lang; cards: OpportunityCard[] }) {
  if (!cards.length) return <p className="text-sm text-slate-400">{t(lang, "noOpportunities")}</p>;
  return (
    <ul className="space-y-3">
      {cards.map((card) => (
        <li key={`${card.source}:${card.sourceId}`} className="rounded-lg border border-slate-700 p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-base font-semibold text-white">{card.title}</h2>
            <span className="text-sm text-slate-300">{card.company}</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">{t(lang, LEVEL_KEY[card.level])}</span>
            <span className="text-[11px] italic text-slate-500">{t(lang, FRESH_KEY[card.freshness])}</span>
          </div>
          {card.location ? <p className="mt-1 text-sm text-slate-300">{card.location}</p> : null}
          {card.waived.length ? (
            <p className="mt-1 text-[11px] italic text-amber-200">
              {t(lang, "filterOff")}: {card.waived.map((rule) => t(lang, WAIVE_KEY[rule])).join(", ")}
            </p>
          ) : null}
          {card.reposted ? <p className="mt-1 text-[11px] text-sky-200">{t(lang, "reposted")}</p> : null}
          <p className="mt-1 text-sm">
            <a className="text-sky-300" href={card.url} target="_blank" rel="noreferrer">{t(lang, "openPosting")}</a>
            {card.officialUrl ? (
              <>
                {" · "}
                <a className="text-sky-300" href={card.officialUrl} target="_blank" rel="noreferrer">{t(lang, "likelyOfficial")}</a>
              </>
            ) : null}
          </p>
          {card.earlier.length ? (
            <ul className="mt-2 text-xs text-slate-400">
              {card.earlier.map((job) => (
                <li key={job.id}>
                  <a className="text-sky-300" href={`/jobs/${job.id}`}>{job.title || card.company}</a>
                  {" · "}
                  {statusLabel(lang, job.status)}
                  {job.status === "rejected" ? ` · ${t(lang, "rejectedHere")}` : job.status === "applied" || job.status === "interviewing" ? ` · ${t(lang, "appliedHere")}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <DecisionButton card={card} decision="added" label={t(lang, "addInterest")} />
            <DecisionButton card={card} decision="applied" label={t(lang, "alreadyApplied")} />
            <DecisionButton card={card} decision="dismissed" label={t(lang, "notForMe")} />
            <DecisionButton card={card} decision="hidden" label={t(lang, "hideJob")} />
            <DecisionButton card={card} decision="duplicate" label={t(lang, "duplicateJob")} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DecisionButton({ card, decision, label }: { card: OpportunityCard; decision: string; label: string }) {
  return (
    <form action={decidePosting}>
      <input type="hidden" name="source" value={card.source} />
      <input type="hidden" name="sourceId" value={card.sourceId} />
      <input type="hidden" name="decision" value={decision} />
      <button className="rounded-md border border-slate-600 px-2 py-1 text-slate-100 hover:border-sky-500" type="submit">{label}</button>
    </form>
  );
}
