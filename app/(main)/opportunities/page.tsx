import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { t, type MessageKey } from "@/lib/i18n";
import { firstParam } from "@/lib/http";
import { PageFrame } from "@/components/chrome";
import { OpportunityCards } from "@/components/opportunity-cards";
import { restoreDecision, searchNow, setSearchRule } from "@/lib/actions/search";
import { loadInbox } from "@/lib/search/inbox";
import { RULE_KEYS, type RuleKey } from "@/lib/search/rules";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RULE_LABEL: Record<RuleKey, MessageKey> = {
  excluded: "ruleExcluded",
  description: "ruleDescription",
  region: "ruleRegion",
  unknown_location: "ruleUnknown",
  outside_israel: "ruleOutside",
  age: "ruleAge",
  junior: "ruleJunior",
  known: "ruleKnown",
};

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!user.jobSearchEnabled) redirect("/dashboard");
  const search = await searchParams;
  const lang = user.uiLanguage;
  const tab = firstParam(search.tab) === "alerts" || firstParam(search.tab) === "replies" ? firstParam(search.tab) : "career";
  const data = await loadInbox(user.id);
  const cursor = data.cursor;
  const running = cursor && cursor.phase !== "done";
  const inbox = tab === "alerts" ? data.alerts : data.career;
  const disabled = new Set(data.rules.filter((rule) => !rule.enabled).map((rule) => rule.ruleKey));

  return (
    <PageFrame lang={lang} title={t(lang, "opportunities")} description={t(lang, "opportunitiesIntro")} search={search}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tab href="/opportunities?tab=career" active={tab === "career"} label={t(lang, "tabCareer")} />
        <Tab href="/opportunities?tab=alerts" active={tab === "alerts"} label={t(lang, "tabAlerts")} />
        <Tab href="/opportunities?tab=replies" active={tab === "replies"} label={t(lang, "tabReplies")} />
        <Link className="text-sm text-sky-300" href="/opportunities/settings">{t(lang, "searchSettings")}</Link>
        <form action={searchNow}>
          <button className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" type="submit">
            {running ? t(lang, "continueSearch") : t(lang, "searchNow")}
          </button>
        </form>
      </div>
      {cursor ? (
        <p className="mb-3 text-sm text-slate-300">
          {running ? t(lang, "searchInProgress") : t(lang, "searchDone")}
          {" "}
          {cursor.stats.boardsOk} {t(lang, "boardsOk")}, {cursor.stats.boardsFailed} {t(lang, "boardsFailed")}, {cursor.stats.newPostings} {t(lang, "newPostings")}, {cursor.stats.mailRead} {t(lang, "mailRead")}, {cursor.stats.repliesApplied} {t(lang, "replyApplied")}, {cursor.stats.repliesUnmatched} {t(lang, "replyUnmatched")}.
          {cursor.mailError === "scope" ? ` ${t(lang, "gmailScope")}` : null}
        </p>
      ) : null}
      {!data.hasTerms ? <p className="mb-3 text-sm text-amber-100">{t(lang, "needsTerms")}</p> : null}

      {tab !== "replies" ? (
        <>
          <section className="mb-4 rounded-lg border border-slate-700 p-3">
            <h2 className="mb-2 text-sm font-semibold text-white">{t(lang, "rulesTitle")}</h2>
            <ul className="space-y-1 text-sm">
              {RULE_KEYS.map((rule) => {
                const count = inbox.counts[rule];
                const off = disabled.has(rule);
                if (!off && count === 0) return null;
                return (
                  <li key={rule} className="flex flex-wrap items-center gap-2">
                    <span>{t(lang, RULE_LABEL[rule])}: {count}</span>
                    <form action={setSearchRule}>
                      <input type="hidden" name="rule" value={rule} />
                      <input type="hidden" name="enabled" value={off ? "1" : "0"} />
                      <button className="text-sky-300" type="submit">{off ? t(lang, "turnOn") : t(lang, "turnOff")}</button>
                    </form>
                  </li>
                );
              })}
              {data.boardOff > 0 ? <li>{t(lang, "boardOff")}: {data.boardOff}</li> : null}
              {data.decisions.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-2">
                  <span>{t(lang, row.decision === "dismissed" ? "notForMe" : row.decision === "hidden" ? "hideJob" : "duplicateJob")}: {row.label}</span>
                  <form action={restoreDecision}>
                    <input type="hidden" name="id" value={row.id} />
                    <button className="text-sky-300" type="submit">{t(lang, "restore")}</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
          <OpportunityCards lang={lang} cards={inbox.visible} />
          {inbox.reposted.length ? (
            <section className="mt-6">
              <h2 className="mb-2 text-lg text-white">{t(lang, "reposted")}</h2>
              <OpportunityCards lang={lang} cards={inbox.reposted} />
            </section>
          ) : null}
        </>
      ) : (
        <ul className="space-y-3">
          {data.replies.length === 0 ? <li className="text-sm text-slate-400">{t(lang, "noReplies")}</li> : null}
          {data.replies.map((reply) => (
            <li key={reply.id} className="rounded-lg border border-slate-700 p-3 text-sm">
              <p className="text-white">{reply.company || t(lang, "replyUnmatched")} {reply.title ? `— ${reply.title}` : ""}</p>
              <p className="text-slate-300">{reply.snippet}</p>
              <p className="mt-1 text-slate-400">
                {reply.verdict === "unmatched" ? t(lang, "replyUnmatched") : reply.applied ? t(lang, "replyApplied") : t(lang, "replySkipped")}
                {reply.jobId ? <> · <Link className="text-sky-300" href={`/jobs/${reply.jobId}`}>{t(lang, "openCompany")}</Link></> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link className={`rounded-md px-3 py-1.5 text-sm ${active ? "bg-slate-100 text-slate-950" : "text-slate-200 ring-1 ring-slate-700"}`} href={href}>
      {label}
    </Link>
  );
}
