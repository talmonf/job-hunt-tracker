import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { firstParam, preserveQuery } from "@/lib/http";
import { dateInputValue, formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { assignmentTags, type TagRef } from "@/lib/tags";
import {
  deleteCertificate,
  deleteEducation,
  deleteEmployment,
  deleteProfileFile,
  deleteVolunteer,
  saveAbout,
  saveCertificate,
  saveEducation,
  saveEmployment,
  saveVolunteer,
  uploadProfileFile,
} from "@/lib/actions/profile";
import { prepareProfileImport } from "@/lib/actions/ai";
import { AI_PROVIDERS } from "@/lib/ai/providers";
import { normalizeProposal } from "@/lib/ai/proposal";
import { Modal, PageFrame } from "@/components/chrome";
import { ProfileReview } from "@/components/profile-review";
import { DateField, SubmitButton, fieldClass, labelClass } from "@/components/widgets";
import { TagChips } from "@/components/tag-chip";
import { TagPicker } from "@/components/tag-picker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const search = await searchParams;
  const lang = user.uiLanguage;
  const [profile, employments, educations, volunteers, certificates, files, catalog, labels, flavors, draftRow] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.employment.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
      include: { tags: { include: { tag: true } }, bullets: { orderBy: { position: "asc" } } },
    }),
    prisma.education.findMany({ where: { userId: user.id }, orderBy: { startDate: "desc" } }),
    prisma.volunteerRole.findMany({ where: { userId: user.id }, orderBy: { startDate: "desc" } }),
    prisma.certificate.findMany({ where: { userId: user.id }, orderBy: { issuedOn: "desc" } }),
    prisma.profileFile.findMany({ where: { userId: user.id }, orderBy: { uploadedAt: "desc" } }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.profileLabel.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.flavor.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: { employments: true, bullets: true, labels: { include: { label: true } } },
    }),
    prisma.profileImport.findFirst({ where: { userId: user.id, status: "pending" }, orderBy: { createdAt: "desc" } }),
  ]);
  const modal = firstParam(search.modal);
  const editId = firstParam(search.id);
  const closeHref = `/profile${preserveQuery(search, {}, ["modal", "id"])}`;
  return (
    <PageFrame lang={lang} title={t(lang, "profile")} description={t(lang, "profileIntro")} search={search}>
      <form action={saveAbout} className="grid gap-3">
        <label>
          <span className={labelClass}>{t(lang, "headline")}</span>
          <input className={fieldClass} name="headline" defaultValue={profile?.headline ?? ""} />
        </label>
        <label>
          <span className={labelClass}>{t(lang, "aboutEn")}</span>
          <textarea className={fieldClass} name="aboutEn" rows={4} defaultValue={profile?.aboutEn ?? ""} />
        </label>
        <label>
          <span className={labelClass}>{t(lang, "aboutHe")}</span>
          <textarea className={fieldClass} name="aboutHe" rows={4} defaultValue={profile?.aboutHe ?? ""} />
        </label>
        <SubmitButton label={t(lang, "save")} />
      </form>

      <Section title={t(lang, "employment")} addHref={`/profile${preserveQuery(search, { modal: "employment" }, ["modal", "id"])}`} addLabel={t(lang, "add")}>
        {employments.map((row) => (
          <article key={row.id} className="rounded-md border border-slate-700 p-3 text-sm">
            <div className="font-medium">{dash(row.title, hide)} · {dash(row.company, hide)}</div>
            <div className="text-slate-400">{row.startDate ? formatDate(row.startDate, user.timezone) : "—"} – {row.isCurrent ? t(lang, "currentRole") : row.endDate ? formatDate(row.endDate, user.timezone) : "—"}</div>
            <BulletList
              hide={hide}
              lines={
                row.bullets.length
                  ? row.bullets.map((bullet) => (lang === "he" && bullet.textHe ? bullet.textHe : bullet.textEn || bullet.textHe))
                  : (lang === "he" && row.descriptionHe ? row.descriptionHe : row.descriptionEn || row.descriptionHe).split("\n").filter(Boolean)
              }
            />
            {row.tags.length ? (
              <div className="mt-2">
                <TagChips tags={assignmentTags(row.tags)} hide={hide} />
              </div>
            ) : null}
            <RowActions editHref={`/profile${preserveQuery(search, { modal: "employment", id: row.id }, ["modal", "id"])}`} deleteAction={deleteEmployment} id={row.id} langEdit={t(lang, "edit")} langDelete={t(lang, "delete")} />
          </article>
        ))}
      </Section>
      <Section title={t(lang, "studies")} addHref={`/profile${preserveQuery(search, { modal: "education" }, ["modal", "id"])}`} addLabel={t(lang, "add")}>
        {educations.map((row) => (
          <article key={row.id} className="rounded-md border border-slate-700 p-3 text-sm">
            <div className="font-medium">{dash(row.school, hide)}</div>
            <div>{dash([row.degree, row.field].filter(Boolean).join(" · "), hide)}</div>
            <RowActions editHref={`/profile${preserveQuery(search, { modal: "education", id: row.id }, ["modal", "id"])}`} deleteAction={deleteEducation} id={row.id} langEdit={t(lang, "edit")} langDelete={t(lang, "delete")} />
          </article>
        ))}
      </Section>
      <Section title={t(lang, "volunteer")} addHref={`/profile${preserveQuery(search, { modal: "volunteer" }, ["modal", "id"])}`} addLabel={t(lang, "add")}>
        {volunteers.map((row) => (
          <article key={row.id} className="rounded-md border border-slate-700 p-3 text-sm">
            <div className="font-medium">{dash(row.organization, hide)} · {dash(row.role, hide)}</div>
            <RowActions editHref={`/profile${preserveQuery(search, { modal: "volunteer", id: row.id }, ["modal", "id"])}`} deleteAction={deleteVolunteer} id={row.id} langEdit={t(lang, "edit")} langDelete={t(lang, "delete")} />
          </article>
        ))}
      </Section>
      <Section title={t(lang, "certificates")} addHref={`/profile${preserveQuery(search, { modal: "certificate" }, ["modal", "id"])}`} addLabel={t(lang, "add")}>
        {certificates.map((row) => (
          <article key={row.id} className="rounded-md border border-slate-700 p-3 text-sm">
            <div className="font-medium">{dash(row.name, hide)}</div>
            <div>{dash(row.issuer, hide)} {row.issuedOn ? `· ${formatDate(row.issuedOn, user.timezone)}` : ""}</div>
            <RowActions editHref={`/profile${preserveQuery(search, { modal: "certificate", id: row.id }, ["modal", "id"])}`} deleteAction={deleteCertificate} id={row.id} langEdit={t(lang, "edit")} langDelete={t(lang, "delete")} />
          </article>
        ))}
      </Section>

      {labels.length ? (
        <section className="mt-8">
          <h2 className="mb-2 text-lg">{t(lang, "labels")}</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {labels.map((label) => (
              <li key={label.id} className="rounded-full border border-slate-600 px-2 py-1">
                {label.kind === "theme" ? t(lang, "theme") : t(lang, "skill")}: {dash(label.name, hide)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {flavors.length ? (
        <section className="mt-8">
          <h2 className="mb-2 text-lg">{t(lang, "flavors")}</h2>
          <div className="grid gap-2">
            {flavors.map((flavor) => (
              <article key={flavor.id} className="rounded-md border border-slate-700 p-3 text-sm">
                <div className="font-medium">{dash(flavor.name, hide)}</div>
                <p className="text-slate-400">
                  {flavor.employments.length} {t(lang, "employment")} · {flavor.bullets.length} {t(lang, "bullets")} · {flavor.labels.map((row) => row.label.name).join(", ")}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <h2 className="mb-2 mt-8 text-lg">{t(lang, "sourceFile")}</h2>
      <p className="mb-2 text-sm text-slate-400">{t(lang, "sourceHint")}</p>
      <form action={prepareProfileImport} className="mb-3 grid gap-3">
        <div className="flex flex-wrap gap-3">
          <label>
            <span className={labelClass}>{t(lang, "outputLanguage")}</span>
            <select className={fieldClass} name="language" defaultValue={lang}>
              <option value="en">{t(lang, "languageEn")}</option>
              <option value="he">{t(lang, "languageHe")}</option>
              <option value="both">{t(lang, "languageBoth")}</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>{t(lang, "provider")}</span>
            <select className={fieldClass} name="provider" defaultValue="openrouter">
              {AI_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>{t(lang, "paySource")}</span>
            <select className={fieldClass} name="paySource" defaultValue={user.aiPaySource}>
              <option value="key">{t(lang, "payWithKey")}</option>
              <option value="credits">{t(lang, "payWithCredits")}</option>
            </select>
          </label>
        </div>
        <ul className="space-y-1 text-sm">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="fileId" value={file.id} />
                <a className="text-sky-300" href={`/files/profile/${file.id}`}>{dash(file.filename, hide)}</a>
              </label>
              <button className="text-rose-300" type="submit" form={`delete-file-${file.id}`}>{t(lang, "delete")}</button>
            </li>
          ))}
        </ul>
        <SubmitButton label={t(lang, "importSelected")} />
      </form>
      {files.map((file) => (
        <form key={file.id} id={`delete-file-${file.id}`} action={deleteProfileFile}>
          <input type="hidden" name="id" value={file.id} />
        </form>
      ))}
      <form action={uploadProfileFile} className="flex items-center gap-2">
        <input name="file" type="file" accept="application/pdf,.pdf" />
        <SubmitButton label={t(lang, "attach")} />
      </form>
      {draftRow && (!firstParam(search.draft) || firstParam(search.draft) === draftRow.id) ? (
        <ProfileReview proposal={normalizeProposal(draftRow.payload, false)} draftId={draftRow.id} lang={lang} />
      ) : null}

      {modal === "employment" ? (
        <Modal title={t(lang, "employment")} closeHref={closeHref} closeLabel={t(lang, "close")}>
          <EmploymentForm row={employments.find((row) => row.id === editId)} timeZone={user.timezone} lang={lang} tags={catalog} hide={hide} />
        </Modal>
      ) : null}
      {modal === "education" ? (
        <Modal title={t(lang, "studies")} closeHref={closeHref} closeLabel={t(lang, "close")}>
          <EducationForm row={educations.find((row) => row.id === editId)} timeZone={user.timezone} lang={lang} />
        </Modal>
      ) : null}
      {modal === "volunteer" ? (
        <Modal title={t(lang, "volunteer")} closeHref={closeHref} closeLabel={t(lang, "close")}>
          <VolunteerForm row={volunteers.find((row) => row.id === editId)} timeZone={user.timezone} lang={lang} />
        </Modal>
      ) : null}
      {modal === "certificate" ? (
        <Modal title={t(lang, "certificates")} closeHref={closeHref} closeLabel={t(lang, "close")}>
          <CertificateForm row={certificates.find((row) => row.id === editId)} timeZone={user.timezone} lang={lang} />
        </Modal>
      ) : null}
    </PageFrame>
  );
}

function BulletList({ lines, hide }: { lines: string[]; hide: boolean }) {
  if (!lines.length) return null;
  return (
    <ul className="mt-2 list-disc ps-5 text-slate-300">
      {lines.map((line, index) => (
        <li key={index}>{dash(line, hide)}</li>
      ))}
    </ul>
  );
}

function Section({ title, addHref, addLabel, children }: { title: string; addHref: string; addLabel: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg">{title}</h2>
        <a className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={addHref}>{addLabel}</a>
      </div>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function RowActions({ editHref, deleteAction, id, langEdit, langDelete }: { editHref: string; deleteAction: (formData: FormData) => void; id: string; langEdit: string; langDelete: string }) {
  return (
    <div className="mt-2 flex gap-3">
      <a className="text-sky-300" href={editHref}>{langEdit}</a>
      <form action={deleteAction}>
        <input type="hidden" name="id" value={id} />
        <button className="text-rose-300" type="submit">{langDelete}</button>
      </form>
    </div>
  );
}

function EmploymentForm({
  row,
  timeZone,
  lang,
  tags,
  hide,
}: {
  row?: {
    id: string;
    title: string;
    company: string;
    startDate: Date | null;
    endDate: Date | null;
    isCurrent: boolean;
    descriptionEn: string;
    descriptionHe: string;
    bullets: { textEn: string; textHe: string }[];
    tags: { tag: TagRef }[];
  };
  timeZone: string;
  lang: "en" | "he";
  tags: TagRef[];
  hide: boolean;
}) {
  return (
    <form action={saveEmployment} className="grid gap-3">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <label><span className={labelClass}>{t(lang, "title")}</span><input className={fieldClass} name="title" defaultValue={row?.title ?? ""} required /></label>
      <label><span className={labelClass}>{t(lang, "company")}</span><input className={fieldClass} name="company" defaultValue={row?.company ?? ""} required /></label>
      <label><span className={labelClass}>{t(lang, "start")}</span><DateField name="startDate" defaultValue={row?.startDate ? dateInputValue(row.startDate, timeZone) : ""} lang={lang} /></label>
      <label><span className={labelClass}>{t(lang, "end")}</span><DateField name="endDate" defaultValue={row?.endDate ? dateInputValue(row.endDate, timeZone) : ""} lang={lang} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isCurrent" value="1" defaultChecked={row?.isCurrent} /> {t(lang, "currentRole")}</label>
      {(row?.bullets.length ? row.bullets : [{ textEn: row?.descriptionEn ?? "", textHe: row?.descriptionHe ?? "" }]).map((bullet, index) => (
        <div key={index} className="grid gap-2 md:grid-cols-2">
          <label><span className={labelClass}>{t(lang, "bulletEn")}</span><input className={fieldClass} name="bulletEn" defaultValue={bullet.textEn} /></label>
          <label><span className={labelClass}>{t(lang, "bulletHe")}</span><input className={fieldClass} name="bulletHe" defaultValue={bullet.textHe} /></label>
        </div>
      ))}
      <div className="grid gap-2 md:grid-cols-2">
        <label><span className={labelClass}>{t(lang, "bulletEn")}</span><input className={fieldClass} name="bulletEn" /></label>
        <label><span className={labelClass}>{t(lang, "bulletHe")}</span><input className={fieldClass} name="bulletHe" /></label>
      </div>
      <TagPicker lang={lang} hide={hide} tags={tags} selected={row ? assignmentTags(row.tags).map((tag) => tag.id) : []} />
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}

function EducationForm({ row, timeZone, lang }: { row?: { id: string; school: string; degree: string; field: string; startDate: Date | null; endDate: Date | null }; timeZone: string; lang: "en" | "he" }) {
  return (
    <form action={saveEducation} className="grid gap-3">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <label><span className={labelClass}>{t(lang, "school")}</span><input className={fieldClass} name="school" defaultValue={row?.school ?? ""} required /></label>
      <label><span className={labelClass}>{t(lang, "degree")}</span><input className={fieldClass} name="degree" defaultValue={row?.degree ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "field")}</span><input className={fieldClass} name="field" defaultValue={row?.field ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "start")}</span><DateField name="startDate" defaultValue={row?.startDate ? dateInputValue(row.startDate, timeZone) : ""} lang={lang} /></label>
      <label><span className={labelClass}>{t(lang, "end")}</span><DateField name="endDate" defaultValue={row?.endDate ? dateInputValue(row.endDate, timeZone) : ""} lang={lang} /></label>
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}

function VolunteerForm({ row, timeZone, lang }: { row?: { id: string; organization: string; role: string; startDate: Date | null; endDate: Date | null; descriptionEn: string; descriptionHe: string }; timeZone: string; lang: "en" | "he" }) {
  return (
    <form action={saveVolunteer} className="grid gap-3">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <label><span className={labelClass}>{t(lang, "organization")}</span><input className={fieldClass} name="organization" defaultValue={row?.organization ?? ""} required /></label>
      <label><span className={labelClass}>{t(lang, "role")}</span><input className={fieldClass} name="role" defaultValue={row?.role ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "start")}</span><DateField name="startDate" defaultValue={row?.startDate ? dateInputValue(row.startDate, timeZone) : ""} lang={lang} /></label>
      <label><span className={labelClass}>{t(lang, "end")}</span><DateField name="endDate" defaultValue={row?.endDate ? dateInputValue(row.endDate, timeZone) : ""} lang={lang} /></label>
      <textarea className={fieldClass} name="descriptionEn" rows={3} defaultValue={row?.descriptionEn ?? ""} />
      <textarea className={fieldClass} name="descriptionHe" rows={3} defaultValue={row?.descriptionHe ?? ""} />
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}

function CertificateForm({ row, timeZone, lang }: { row?: { id: string; name: string; issuer: string; issuedOn: Date | null; url: string }; timeZone: string; lang: "en" | "he" }) {
  return (
    <form action={saveCertificate} className="grid gap-3">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <label><span className={labelClass}>{t(lang, "certificates")}</span><input className={fieldClass} name="name" defaultValue={row?.name ?? ""} required /></label>
      <label><span className={labelClass}>{t(lang, "issuer")}</span><input className={fieldClass} name="issuer" defaultValue={row?.issuer ?? ""} /></label>
      <label><span className={labelClass}>{t(lang, "issuedOn")}</span><DateField name="issuedOn" defaultValue={row?.issuedOn ? dateInputValue(row.issuedOn, timeZone) : ""} lang={lang} /></label>
      <label><span className={labelClass}>{t(lang, "urls")}</span><input className={fieldClass} name="url" defaultValue={row?.url ?? ""} /></label>
      <SubmitButton label={t(lang, "save")} />
    </form>
  );
}
