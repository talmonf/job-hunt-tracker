import type { Proposal } from "@/lib/ai/proposal";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { acceptProfileImport, discardProfileImport } from "@/lib/actions/ai";
import { SubmitButton, fieldClass, labelClass } from "@/components/widgets";

export function ProfileReview({ proposal, draftId, lang }: { proposal: Proposal; draftId: string; lang: Lang }) {
  const employments = [...proposal.employments, { key: "extra-emp", title: "", company: "", startDate: "", endDate: "", isCurrent: false, bullets: [] }];
  const educations = [...proposal.educations, { key: "extra-edu", school: "", degree: "", field: "", startDate: "", endDate: "" }];
  const volunteers = [...proposal.volunteers, { key: "extra-vol", organization: "", role: "", startDate: "", endDate: "", textEn: "", textHe: "" }];
  const certificates = [...proposal.certificates, { key: "extra-cert", name: "", issuer: "", issuedOn: "", url: "" }];
  const labels = [...proposal.labels, { key: "extra-label", kind: "skill" as const, name: "" }];
  const flavors = [...proposal.flavors, { key: "extra-flavor", name: "", employmentKeys: [] as string[], bulletKeys: [] as string[], labelKeys: [] as string[] }];
  return (
    <div className="mt-8">
    <form action={acceptProfileImport} className="grid gap-4 rounded-md border border-sky-800 p-3">
      <div>
        <h2 className="text-lg">{t(lang, "importReview")}</h2>
        <p className="text-sm text-slate-400">{t(lang, "importReviewHint")}</p>
        {proposal.usedModel ? <p className="mt-1 text-sm text-slate-300">{t(lang, "usedModel")}</p> : null}
      </div>
      <input type="hidden" name="draftId" value={draftId} />
      <input type="hidden" name="usedModel" value={proposal.usedModel ? "1" : "0"} />
      <input type="hidden" name="empCount" value={employments.length} />
      <input type="hidden" name="eduCount" value={educations.length} />
      <input type="hidden" name="volCount" value={volunteers.length} />
      <input type="hidden" name="certCount" value={certificates.length} />
      <input type="hidden" name="labelCount" value={labels.length} />
      <input type="hidden" name="flavorCount" value={flavors.length} />
      <label>
        <span className={labelClass}>{t(lang, "headline")}</span>
        <input className={fieldClass} name="headline" defaultValue={proposal.headline} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "aboutEn")}</span>
        <textarea className={fieldClass} name="aboutEn" rows={3} defaultValue={proposal.aboutEn} />
      </label>
      <label>
        <span className={labelClass}>{t(lang, "aboutHe")}</span>
        <textarea className={fieldClass} name="aboutHe" rows={3} defaultValue={proposal.aboutHe} />
      </label>
      {proposal.conflicts.length ? (
        <div className="rounded-md border border-amber-700 p-3 text-sm">
          <div className="mb-1 font-medium">{t(lang, "conflicts")}</div>
          {proposal.conflicts.map((conflict) => (
            <p key={conflict.field}>
              {conflict.field}: {conflict.values.join(" · ")}
            </p>
          ))}
        </div>
      ) : null}
      <h3 className="text-base">{t(lang, "employment")}</h3>
      {employments.map((row, index) => (
        <fieldset key={row.key} className="grid gap-2 rounded-md border border-slate-700 p-3">
          <input type="hidden" name={`emp_${index}_key`} value={row.key} />
          <input type="hidden" name={`emp_${index}_bulletCount`} value={row.bullets.length + 1} />
          <label><span className={labelClass}>{t(lang, "title")}</span><input className={fieldClass} name={`emp_${index}_title`} defaultValue={row.title} /></label>
          <label><span className={labelClass}>{t(lang, "company")}</span><input className={fieldClass} name={`emp_${index}_company`} defaultValue={row.company} /></label>
          <label><span className={labelClass}>{t(lang, "start")}</span><input className={fieldClass} name={`emp_${index}_start`} defaultValue={row.startDate} placeholder="YYYY-MM-DD" /></label>
          <label><span className={labelClass}>{t(lang, "end")}</span><input className={fieldClass} name={`emp_${index}_end`} defaultValue={row.endDate} placeholder="YYYY-MM-DD" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={`emp_${index}_current`} value="1" defaultChecked={row.isCurrent} /> {t(lang, "currentRole")}</label>
          {row.bullets.map((bullet, bulletIndex) => (
            <BulletFields key={bullet.key} lang={lang} prefix={`emp_${index}_b_${bulletIndex}`} bulletKey={bullet.key} textEn={bullet.textEn} textHe={bullet.textHe} />
          ))}
          <BulletFields lang={lang} prefix={`emp_${index}_b_${row.bullets.length}`} bulletKey={`${row.key}b-extra`} textEn="" textHe="" />
        </fieldset>
      ))}
      <h3 className="text-base">{t(lang, "studies")}</h3>
      {educations.map((row, index) => (
        <fieldset key={row.key} className="grid gap-2 rounded-md border border-slate-700 p-3">
          <input type="hidden" name={`edu_${index}_key`} value={row.key} />
          <label><span className={labelClass}>{t(lang, "school")}</span><input className={fieldClass} name={`edu_${index}_school`} defaultValue={row.school} /></label>
          <label><span className={labelClass}>{t(lang, "degree")}</span><input className={fieldClass} name={`edu_${index}_degree`} defaultValue={row.degree} /></label>
          <label><span className={labelClass}>{t(lang, "field")}</span><input className={fieldClass} name={`edu_${index}_field`} defaultValue={row.field} /></label>
          <label><span className={labelClass}>{t(lang, "start")}</span><input className={fieldClass} name={`edu_${index}_start`} defaultValue={row.startDate} /></label>
          <label><span className={labelClass}>{t(lang, "end")}</span><input className={fieldClass} name={`edu_${index}_end`} defaultValue={row.endDate} /></label>
        </fieldset>
      ))}
      <h3 className="text-base">{t(lang, "volunteer")}</h3>
      {volunteers.map((row, index) => (
        <fieldset key={row.key} className="grid gap-2 rounded-md border border-slate-700 p-3">
          <input type="hidden" name={`vol_${index}_key`} value={row.key} />
          <label><span className={labelClass}>{t(lang, "organization")}</span><input className={fieldClass} name={`vol_${index}_organization`} defaultValue={row.organization} /></label>
          <label><span className={labelClass}>{t(lang, "role")}</span><input className={fieldClass} name={`vol_${index}_role`} defaultValue={row.role} /></label>
          <label><span className={labelClass}>{t(lang, "start")}</span><input className={fieldClass} name={`vol_${index}_start`} defaultValue={row.startDate} /></label>
          <label><span className={labelClass}>{t(lang, "end")}</span><input className={fieldClass} name={`vol_${index}_end`} defaultValue={row.endDate} /></label>
          <label><span className={labelClass}>{t(lang, "bodyEn")}</span><textarea className={fieldClass} name={`vol_${index}_en`} rows={2} defaultValue={row.textEn} /></label>
          <label><span className={labelClass}>{t(lang, "bodyHe")}</span><textarea className={fieldClass} name={`vol_${index}_he`} rows={2} defaultValue={row.textHe} /></label>
        </fieldset>
      ))}
      <h3 className="text-base">{t(lang, "certificates")}</h3>
      {certificates.map((row, index) => (
        <fieldset key={row.key} className="grid gap-2 rounded-md border border-slate-700 p-3">
          <input type="hidden" name={`cert_${index}_key`} value={row.key} />
          <label><span className={labelClass}>{t(lang, "certificates")}</span><input className={fieldClass} name={`cert_${index}_name`} defaultValue={row.name} /></label>
          <label><span className={labelClass}>{t(lang, "issuer")}</span><input className={fieldClass} name={`cert_${index}_issuer`} defaultValue={row.issuer} /></label>
          <label><span className={labelClass}>{t(lang, "issuedOn")}</span><input className={fieldClass} name={`cert_${index}_issued`} defaultValue={row.issuedOn} /></label>
          <label><span className={labelClass}>{t(lang, "urls")}</span><input className={fieldClass} name={`cert_${index}_url`} defaultValue={row.url} /></label>
        </fieldset>
      ))}
      <h3 className="text-base">{t(lang, "labels")}</h3>
      {labels.map((row, index) => (
        <div key={row.key} className="grid gap-2 md:grid-cols-2">
          <input type="hidden" name={`label_${index}_key`} value={row.key} />
          <label>
            <span className={labelClass}>{t(lang, "labelKind")}</span>
            <select className={fieldClass} name={`label_${index}_kind`} defaultValue={row.kind}>
              <option value="skill">{t(lang, "skill")}</option>
              <option value="theme">{t(lang, "theme")}</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>{t(lang, "tagName")}</span>
            <input className={fieldClass} name={`label_${index}_name`} defaultValue={row.name} />
          </label>
        </div>
      ))}
      <h3 className="text-base">{t(lang, "flavors")}</h3>
      <p className="text-sm text-slate-400">{t(lang, "flavorHint")}</p>
      {flavors.map((flavor, index) => (
        <fieldset key={flavor.key} className="grid gap-2 rounded-md border border-slate-700 p-3">
          <input type="hidden" name={`flavor_${index}_key`} value={flavor.key} />
          <label><span className={labelClass}>{t(lang, "flavor")}</span><input className={fieldClass} name={`flavor_${index}_name`} defaultValue={flavor.name} /></label>
          <div className="grid gap-1 text-sm">
            {proposal.employments.map((row) => (
              <label key={row.key} className="flex items-center gap-2">
                <input type="checkbox" name={`flavor_${index}_emp`} value={row.key} defaultChecked={flavor.employmentKeys.includes(row.key)} />
                {row.title || row.company}
              </label>
            ))}
            {proposal.employments.flatMap((row) => row.bullets).map((bullet) => (
              <label key={bullet.key} className="flex items-center gap-2">
                <input type="checkbox" name={`flavor_${index}_bullet`} value={bullet.key} defaultChecked={flavor.bulletKeys.includes(bullet.key)} />
                {bullet.textEn || bullet.textHe}
              </label>
            ))}
            {proposal.labels.filter((row) => row.kind === "skill").map((row) => (
              <label key={row.key} className="flex items-center gap-2">
                <input type="checkbox" name={`flavor_${index}_label`} value={row.key} defaultChecked={flavor.labelKeys.includes(row.key)} />
                {row.name}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-3">
        <SubmitButton label={t(lang, "acceptImport")} />
      </div>
      <div>
        <button className="text-sm text-rose-300" type="submit" form="discard-import">{t(lang, "discardImport")}</button>
      </div>
    </form>
    <form id="discard-import" action={discardProfileImport}>
      <input type="hidden" name="draftId" value={draftId} />
    </form>
    </div>
  );
}

function BulletFields({ lang, prefix, bulletKey, textEn, textHe }: { lang: Lang; prefix: string; bulletKey: string; textEn: string; textHe: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <input type="hidden" name={`${prefix}_key`} value={bulletKey} />
      <label><span className={labelClass}>{t(lang, "bulletEn")}</span><input className={fieldClass} name={`${prefix}_en`} defaultValue={textEn} /></label>
      <label><span className={labelClass}>{t(lang, "bulletHe")}</span><input className={fieldClass} name={`${prefix}_he`} defaultValue={textHe} /></label>
    </div>
  );
}
