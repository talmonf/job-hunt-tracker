import { dismissGuide } from "@/lib/actions/settings";
import { t } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { PageFrame } from "@/components/chrome";
import { SubmitButton } from "@/components/widgets";

export const dynamic = "force-dynamic";

const steps = ["guideJobs", "guideStatus", "guidePeople", "guideDashboard", "guideOptional"] as const;

export default async function GuidePage() {
  const user = await requireUser();
  const lang = user.uiLanguage;
  return (
    <PageFrame lang={lang} title={t(lang, "guideTitle")} description={t(lang, "guideIntro")}>
      <section className="mb-6">
        <h2 className="mb-2 text-lg">{t(lang, "guideMentmeTitle")}</h2>
        <p className="text-sm text-slate-300">{t(lang, "guideMentmeXlsx")}</p>
        <p className="mt-2 text-sm text-slate-300">{t(lang, "guideMentmeBody")}</p>
        <a className="mt-2 inline-block text-sm text-sky-300" href="/settings?section=import#import" target="_blank" rel="noopener noreferrer">
          {t(lang, "guideMentmeLink")}
        </a>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg">{t(lang, "guideLinkedInTitle")}</h2>
        <p className="text-sm text-slate-300">{t(lang, "guideLinkedInSave")}</p>
        <p className="mt-2 text-sm text-slate-300">{t(lang, "guideLinkedInUpload")}</p>
        <a className="mt-2 inline-block text-sm text-sky-300" href="/profile" target="_blank" rel="noopener noreferrer">
          {t(lang, "guideLinkedInLink")}
        </a>
        <p className="mt-2 text-sm text-slate-300">{t(lang, "guideAiNote")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg">{t(lang, "guideWorkTitle")}</h2>
        <ul className="list-disc space-y-2 ps-5 text-sm text-slate-300">
          {steps.map((key) => (
            <li key={key}>{t(lang, key)}</li>
          ))}
        </ul>
      </section>

      <form action={dismissGuide}>
        <SubmitButton label={t(lang, "guideContinue")} />
      </form>
    </PageFrame>
  );
}
