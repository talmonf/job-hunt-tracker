import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { firstParam, preserveQuery } from "@/lib/http";
import { dateInputValue, formatDate, formatMonthYear } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { assignmentTags, rankByOverlap, type TagRef } from "@/lib/tags";
import { discardProfileImport } from "@/lib/actions/ai";
import {
  deleteCertificate,
  deleteEducation,
  deleteEmployment,
  deleteVolunteer,
  importLinkedInPdf,
  saveAbout,
  saveCertificate,
  saveEducation,
  saveEmployment,
  saveProfileTags,
  saveVolunteer,
  uploadProfileFile,
} from "@/lib/actions/profile";
import { normalizeProposal } from "@/lib/ai/proposal";
import { Modal, PageFrame } from "@/components/chrome";
import { CollapseRow } from "@/components/collapse-row";
import { CvLibrary } from "@/components/cv-library";
import { ProfileReview } from "@/components/profile-review";
import { FilePicker } from "@/components/file-picker";
import { DateField, SubmitButton, fieldClass, labelClass } from "@/components/widgets";
import { RelatedByTags } from "@/components/related-tags";
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
  const [profile, employments, educations, volunteers, certificates, files, catalog, draftRow, notes, jobs, contacts] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id }, include: { tags: { include: { tag: true } } } }),
    prisma.employment.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
      include: { tags: { include: { tag: true } }, bullets: { orderBy: { position: "asc" } }, notes: { orderBy: { createdAt: "desc" }, select: { id: true, title: true } } },
    }),
    prisma.education.findMany({ where: { userId: user.id }, orderBy: { startDate: "desc" } }),
    prisma.volunteerRole.findMany({ where: { userId: user.id }, orderBy: { startDate: "desc" } }),
    prisma.certificate.findMany({ where: { userId: user.id }, orderBy: { issuedOn: "desc" } }),
    prisma.profileFile.findMany({ where: { userId: user.id }, orderBy: { uploadedAt: "desc" } }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.profileImport.findFirst({ where: { userId: user.id, status: "pending" }, orderBy: { createdAt: "desc" } }),
    prisma.note.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, type: true, tags: { include: { tag: true } } },
    }),
    prisma.job.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, companyName: true, tags: { include: { tag: true } } },
    }),
    prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, fullName: true, tags: { include: { tag: true } } },
    }),
  ]);
  const modal = firstParam(search.modal);
  const editId = firstParam(search.id);
  const closeHref = `/profile${preserveQuery(search, {}, ["modal", "id"])}`;
  const profileEmpty =
    !(profile?.headline ?? "").trim() &&
    !(profile?.aboutEn ?? "").trim() &&
    !(profile?.aboutHe ?? "").trim() &&
    employments.length === 0 &&
    educations.length === 0 &&
    volunteers.length === 0 &&
    certificates.length === 0;
  return (
    <PageFrame lang={lang} title={t(lang, "profile")} description={t(lang, "profileIntro")} search={search}>
      {draftRow && (!firstParam(search.draft) || firstParam(search.draft) === draftRow.id) ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-sky-800 px-3 py-2 text-sm text-slate-100">
          <p>
            {t(lang, "importReviewReady")}{" "}
            <a className="text-sky-300 hover:text-sky-200" href="#import-review">
              {t(lang, "importReview")}
            </a>
          </p>
          <form action={discardProfileImport}>
            <input type="hidden" name="draftId" value={draftRow.id} />
            <button className="text-rose-300 hover:text-rose-200" type="submit">
              {t(lang, "discardImport")}
            </button>
          </form>
        </div>
      ) : null}
      {profileEmpty && !draftRow ? (
        <form action={importLinkedInPdf} className="mb-6">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-sm text-slate-200">{t(lang, "importLinkedIn")}</span>
            <details className="relative">
              <summary
                className="flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-slate-500 text-xs text-slate-200 [&::-webkit-details-marker]:hidden"
                aria-label={t(lang, "importLinkedInHelp")}
              >
                ?
              </summary>
              <p className="absolute z-10 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-slate-600 bg-slate-900 p-2 text-sm leading-relaxed text-slate-100 shadow-lg">
                {t(lang, "guideLinkedInSave")}
              </p>
            </details>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilePicker
              name="file"
              accept="application/pdf,.pdf"
              required
              chooseLabel={t(lang, "chooseFile")}
              emptyLabel={t(lang, "noFileChosen")}
            />
            <SubmitButton label={t(lang, "importAction")} />
          </div>
        </form>
      ) : null}
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
        <SubmitButton label={t(lang, "save")} thin />
      </form>

      <ProfileTags lang={lang} hide={hide} catalog={catalog} profileTags={assignmentTags(profile?.tags ?? [])} jobs={jobs} notes={notes} contacts={contacts} />

      <Section title={t(lang, "employment")} addHref={`/profile${preserveQuery(search, { modal: "employment" }, ["modal", "id"])}`} addLabel={t(lang, "add")}>
        {employments.map((row) => (
          <CollapseRow
            key={row.id}
            id={`employment-${row.id}`}
            className="scroll-mt-20"
            summary={datedSummary(
              [dash(row.title, hide), dash(row.company, hide)],
              row.startDate,
              row.isCurrent ? null : row.endDate,
              user.timezone,
              row.isCurrent ? t(lang, "currentRole") : undefined,
            )}
          >
            <BulletList
              hide={hide}
              lines={
                row.bullets.length
                  ? row.bullets.map((bullet) => (lang === "he" && bullet.textHe ? bullet.textHe : bullet.textEn || bullet.textHe))
                  : (lang === "he" && row.descriptionHe ? row.descriptionHe : row.descriptionEn || row.descriptionHe).split("\n").filter(Boolean)
              }
            />
            {row.tags.length ? <TagChips tags={assignmentTags(row.tags)} hide={hide} /> : null}
            {row.notes.length ? (
              <ul className="space-y-1">
                {row.notes.map((note) => (
                  <li key={note.id}>
                    <a className="text-sky-300" href={`/notes/${note.id}`}>
                      {dash(note.title, hide)}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <a className="text-sky-300" href={`/notes?modal=new&subject=${encodeURIComponent(`employment:${row.id}`)}`}>
              {t(lang, "addNote")}
            </a>
            <RowActions editHref={`/profile${preserveQuery(search, { modal: "employment", id: row.id }, ["modal", "id"])}`} deleteAction={deleteEmployment} id={row.id} langEdit={t(lang, "edit")} langDelete={t(lang, "delete")} />
          </CollapseRow>
        ))}
      </Section>
      <Section title={t(lang, "studies")} addHref={`/profile${preserveQuery(search, { modal: "education" }, ["modal", "id"])}`} addLabel={t(lang, "add")}>
        {educations.map((row) => (
          <CollapseRow
            key={row.id}
            summary={datedSummary(
              [dash(row.school, hide), dash([row.degree, row.field].filter(Boolean).join(" · "), hide)],
              row.startDate,
              row.endDate,
              user.timezone,
            )}
          >
            <RowActions editHref={`/profile${preserveQuery(search, { modal: "education", id: row.id }, ["modal", "id"])}`} deleteAction={deleteEducation} id={row.id} langEdit={t(lang, "edit")} langDelete={t(lang, "delete")} />
          </CollapseRow>
        ))}
      </Section>
      <Section title={t(lang, "volunteer")} addHref={`/profile${preserveQuery(search, { modal: "volunteer" }, ["modal", "id"])}`} addLabel={t(lang, "add")}>
        {volunteers.map((row) => (
          <CollapseRow
            key={row.id}
            summary={datedSummary([dash(row.organization, hide), dash(row.role, hide)], row.startDate, row.endDate, user.timezone)}
          >
            <RowActions editHref={`/profile${preserveQuery(search, { modal: "volunteer", id: row.id }, ["modal", "id"])}`} deleteAction={deleteVolunteer} id={row.id} langEdit={t(lang, "edit")} langDelete={t(lang, "delete")} />
          </CollapseRow>
        ))}
      </Section>
      <Section title={t(lang, "certificates")} addHref={`/profile${preserveQuery(search, { modal: "certificate" }, ["modal", "id"])}`} addLabel={t(lang, "add")}>
        {certificates.map((row) => (
          <CollapseRow key={row.id} summary={datedSummary([dash(row.name, hide), dash(row.issuer, hide)], row.issuedOn, null, user.timezone)}>
            <RowActions editHref={`/profile${preserveQuery(search, { modal: "certificate", id: row.id }, ["modal", "id"])}`} deleteAction={deleteCertificate} id={row.id} langEdit={t(lang, "edit")} langDelete={t(lang, "delete")} />
          </CollapseRow>
        ))}
      </Section>

      <section id="source" className="mt-8 scroll-mt-20">
        <h2 className="mb-2 text-lg">
          {t(lang, "sourceFile")} <span className="text-slate-400">{files.length}</span>
        </h2>
        <p className="mb-2 text-sm text-slate-400">{t(lang, "sourceHint")}</p>
        <form action={uploadProfileFile} className="mb-3 flex items-center gap-2">
          <input name="file" type="file" accept="application/pdf,.pdf" />
          <SubmitButton label={t(lang, "attach")} thin />
        </form>
        <CvLibrary
          lang={lang}
          defaultLanguage={lang}
          paySource={user.aiPaySource}
          files={files.map((file) => ({
            id: file.id,
            filename: dash(file.filename, hide),
            uploadedOn: formatDate(file.uploadedAt, user.timezone),
          }))}
        />
      </section>
      {draftRow && (!firstParam(search.draft) || firstParam(search.draft) === draftRow.id) ? (
        <ProfileReview
          proposal={normalizeProposal(draftRow.payload, false)}
          draftId={draftRow.id}
          lang={lang}
          existingNoteTitles={notes.filter((note) => note.type === "work_experience").map((note) => note.title)}
        />
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

function datedSummary(parts: string[], start: Date | null, end: Date | null, timeZone: string, currentLabel?: string) {
  const endLabel = currentLabel ?? (end ? formatMonthYear(end, timeZone) : "");
  const dates = [start ? formatMonthYear(start, timeZone) : "", endLabel].filter(Boolean).join(" – ");
  return [...parts, dates].map((part) => part.trim()).filter((part) => part && part !== "—").join(" · ") || "—";
}

function BulletList({ lines, hide }: { lines: string[]; hide: boolean }) {
  if (!lines.length) return null;
  return (
    <ul className="list-disc ps-5 text-slate-300">
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
    <div className="flex gap-3">
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

function ProfileTags({
  lang,
  hide,
  catalog,
  profileTags,
  jobs,
  notes,
  contacts,
}: {
  lang: "en" | "he";
  hide: boolean;
  catalog: TagRef[];
  profileTags: TagRef[];
  jobs: { id: string; title: string; companyName: string; tags: { tag: TagRef }[] }[];
  notes: { id: string; title: string; tags: { tag: TagRef }[] }[];
  contacts: { id: string; fullName: string; tags: { tag: TagRef }[] }[];
}) {
  const ids = profileTags.map((tag) => tag.id);
  const relatedJobs = rankByOverlap(
    jobs,
    (row) => assignmentTags(row.tags),
    ids,
    (row) => `${row.companyName} ${row.title}`,
  ).map((row) => ({
    id: row.item.id,
    label: row.item.title ? `${row.item.companyName} — ${row.item.title}` : row.item.companyName,
    overlap: row.overlap,
  }));
  const relatedNotes = rankByOverlap(
    notes,
    (row) => assignmentTags(row.tags),
    ids,
    (row) => row.title,
  ).map((row) => ({ id: row.item.id, label: row.item.title, overlap: row.overlap }));
  const relatedContacts = rankByOverlap(
    contacts,
    (row) => assignmentTags(row.tags),
    ids,
    (row) => row.fullName,
  ).map((row) => ({ id: row.item.id, label: row.item.fullName, overlap: row.overlap }));
  return (
    <section id="tags" className="mt-8 scroll-mt-20">
      <h2 className="mb-1 text-lg">{t(lang, "tags")}</h2>
      <p className="mb-3 text-sm text-slate-400">{t(lang, "profileTagsHint")}</p>
      <form action={saveProfileTags}>
        <TagPicker lang={lang} hide={hide} tags={catalog} selected={ids} compact />
      </form>
      <RelatedByTags
        lang={lang}
        hide={hide}
        hasTags={ids.length > 0}
        emptyText={t(lang, "profileTagsEmpty")}
        jobs={relatedJobs}
        notes={relatedNotes}
        contacts={relatedContacts}
        employments={[]}
      />
    </section>
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
