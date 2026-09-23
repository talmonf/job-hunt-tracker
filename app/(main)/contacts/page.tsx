import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { firstParam, preserveQuery } from "@/lib/http";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { createContact } from "@/lib/actions/network";
import { EmptyState, Modal, PageFrame } from "@/components/chrome";
import { fieldClass, labelClass } from "@/components/widgets";
import { ContactFields } from "@/components/contact-fields";

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
  const where: Prisma.ContactWhereInput = {
    userId: user.id,
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { workplace: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(willing === "yes" ? { willingToRecommend: true } : willing === "no" ? { willingToRecommend: false } : {}),
  };
  const contacts = await prisma.contact.findMany({ where, orderBy: { [sort]: dir } });
  return (
    <PageFrame lang={lang} title={t(lang, "networking")} description={t(lang, "contactsIntro")} search={search}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg">{t(lang, "networking")}</h2>
        <Link className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={`/contacts${preserveQuery(search, { modal: "new" }, ["modal"])}`}>
          {t(lang, "addContact")}
        </Link>
      </div>
      <form className="mb-4 rounded-lg border border-slate-700 p-3" method="get">
        <fieldset>
          <legend className="px-1 text-sm">{t(lang, "filters")}</legend>
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <label>
              <span className={labelClass}>{t(lang, "search")}</span>
              <input className={fieldClass} name="q" defaultValue={q} placeholder={t(lang, "nameOrWorkplace")} />
            </label>
            <label>
              <span className={labelClass}>{t(lang, "willing")}</span>
              <select className={fieldClass} name="willing" defaultValue={willing}>
                <option value="">{t(lang, "any")}</option>
                <option value="yes">{t(lang, "yes")}</option>
                <option value="no">{t(lang, "no")}</option>
              </select>
            </label>
          </div>
          <button className="mt-3 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" type="submit">{t(lang, "apply")}</button>
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
                  <td className="px-3 py-2">{dash(contact.role, hide)}</td>
                  <td className="px-3 py-2">{dash(contact.workplace, hide)}</td>
                  <td className="px-3 py-2">{dash(contact.status, hide)}</td>
                  <td className="px-3 py-2">{contact.nextActionDate ? formatDate(contact.nextActionDate, user.timezone) : "—"}</td>
                  <td className="px-3 py-2">{contact.willingToRecommend ? t(lang, "yes") : t(lang, "no")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {firstParam(search.modal) === "new" ? (
        <Modal title={t(lang, "addContact")} closeHref={`/contacts${preserveQuery(search, {}, ["modal"])}`} closeLabel={t(lang, "close")}>
          <ContactFields lang={lang} action={createContact} />
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
