import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { allParams, firstParam, preserveQuery } from "@/lib/http";
import { dateInputValue } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { dash, maskText } from "@/lib/mask";
import { assignmentTags } from "@/lib/tags";
import { createContact } from "@/lib/actions/network";
import { EmptyState, Modal, PageFrame } from "@/components/chrome";
import { MultiSelect, compactFieldClass, compactLabelClass } from "@/components/widgets";
import { TagChips } from "@/components/tag-chip";
import { ContactFields } from "@/components/contact-fields";
import { ContactDateEditor, ContactStatusEditor, ContactWillingEditor } from "@/components/contact-inline";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const search = await searchParams;
  const lang = user.uiLanguage;
  const q = firstParam(search.q);
  const willing = firstParam(search.willing);
  const sort = ["fullName", "workplace", "status", "nextActionDate"].includes(firstParam(search.sort)) ? firstParam(search.sort) : "fullName";
  const dir = firstParam(search.dir) === "desc" ? "desc" : "asc";
  const catalog = await prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } });
  const tagIds = allParams(search.tag).filter((id) => catalog.some((tag) => tag.id === id));
  const where: Prisma.ContactWhereInput = {
    userId: user.id,
    ...(tagIds.length ? { tags: { some: { tagId: { in: tagIds } } } } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { firstNameHe: { contains: q, mode: "insensitive" } },
            { lastNameHe: { contains: q, mode: "insensitive" } },
            { workplace: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(willing === "yes" ? { willingToRecommend: true } : willing === "no" ? { willingToRecommend: false } : {}),
  };
  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { [sort]: dir },
    include: { tags: { include: { tag: true } } },
  });
  return (
    <PageFrame lang={lang} title={t(lang, "networking")} description={t(lang, "contactsIntro")} search={search}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg">{t(lang, "networking")}</h2>
        <Link className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={`/contacts${preserveQuery(search, { modal: "new" }, ["modal"])}`}>
          {t(lang, "addContact")}
        </Link>
      </div>
      <form className="mb-3 rounded-lg border border-slate-700 px-3 py-2" method="get">
        <fieldset>
          <legend className="px-1 text-sm">{t(lang, "filters")}</legend>
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <label className="w-52 min-w-0">
              <span className={compactLabelClass}>{t(lang, "search")}</span>
              <input className={compactFieldClass} name="q" defaultValue={q} placeholder={t(lang, "nameOrWorkplace")} />
            </label>
            <label className="w-44 min-w-0">
              <span className={compactLabelClass}>{t(lang, "willing")}</span>
              <select className={compactFieldClass} name="willing" defaultValue={willing}>
                <option value="">{t(lang, "any")}</option>
                <option value="yes">{t(lang, "yes")}</option>
                <option value="no">{t(lang, "no")}</option>
              </select>
            </label>
            {catalog.length ? (
              <div className="w-44 min-w-0">
                <span className={compactLabelClass}>{t(lang, "tags")}</span>
                <MultiSelect
                  compact
                  name="tag"
                  selected={tagIds}
                  anyLabel={t(lang, "any")}
                  selectAll={t(lang, "selectAll")}
                  deselectAll={t(lang, "deselectAll")}
                  done={t(lang, "done")}
                  selectedWord={t(lang, "selectedCount")}
                  options={catalog.map((tag) => ({ value: tag.id, label: maskText(tag.name, hide) }))}
                />
              </div>
            ) : null}
            <button className="rounded bg-sky-500 px-2 py-0.5 text-xs font-semibold leading-tight text-slate-950" type="submit">{t(lang, "apply")}</button>
          </div>
        </fieldset>
      </form>
      {contacts.length === 0 ? (
        <EmptyState>{t(lang, "emptyContacts")}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <Sort label={t(lang, "fullName")} column="fullName" sort={sort} dir={dir} search={search} />
                <th className="px-3 py-2">{t(lang, "tags")}</th>
                <th className="px-3 py-2">{t(lang, "role")}</th>
                <Sort label={t(lang, "workplace")} column="workplace" sort={sort} dir={dir} search={search} />
                <Sort label={t(lang, "status")} column="status" sort={sort} dir={dir} search={search} />
                <Sort label={t(lang, "nextActionDate")} column="nextActionDate" sort={sort} dir={dir} search={search} />
                <th className="px-3 py-2">{t(lang, "willing")}</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-t border-slate-800">
                  <td className="px-3 py-2"><Link className="text-sky-300" href={`/contacts/${contact.id}`}>{dash(contact.fullName, hide)}</Link></td>
                  <td className="px-3 py-2"><TagChips tags={assignmentTags(contact.tags)} hide={hide} /></td>
                  <td className="px-3 py-2">{dash(contact.role, hide)}</td>
                  <td className="px-3 py-2">{dash(contact.workplace, hide)}</td>
                  <td className="px-3 py-2">
                    <ContactStatusEditor contactId={contact.id} status={contact.status} lang={lang} />
                  </td>
                  <td className="px-3 py-2">
                    <ContactDateEditor
                      contactId={contact.id}
                      value={contact.nextActionDate ? dateInputValue(contact.nextActionDate, user.timezone) : ""}
                      lang={lang}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <ContactWillingEditor contactId={contact.id} willing={contact.willingToRecommend} lang={lang} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {firstParam(search.modal) === "new" ? (
        <Modal title={t(lang, "addContact")} closeHref={`/contacts${preserveQuery(search, {}, ["modal"])}`} closeLabel={t(lang, "close")}>
          <ContactFields
            lang={lang}
            action={createContact}
            localContacts={contacts.map((item) => ({
              id: item.id,
              fullName: item.fullName,
              role: item.role,
              workplace: item.workplace,
              googleResourceName: item.googleResourceName,
              linkedinUrl: item.linkedinUrl,
            }))}
            googleConnected={Boolean(user.contactsRefreshToken)}
            googleAtStart
            tags={catalog}
            hide={hide}
          />
        </Modal>
      ) : null}
    </PageFrame>
  );
}

function Sort({ label, column, sort, dir, search }: { label: string; column: string; sort: string; dir: string; search: Record<string, string | string[] | undefined> }) {
  const nextDir = sort === column && dir === "asc" ? "desc" : "asc";
  const active = sort === column;
  return (
    <th className="px-3 py-2" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={`/contacts${preserveQuery(search, { sort: column, dir: nextDir }, ["modal"])}`}>{label}{active ? (dir === "asc" ? " ↑" : " ↓") : ""}</Link>
    </th>
  );
}
