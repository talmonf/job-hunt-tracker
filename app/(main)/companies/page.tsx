import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { firstParam, preserveQuery } from "@/lib/http";
import { companySizeLabel, t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { assignmentTags } from "@/lib/tags";
import { createCompany } from "@/lib/actions/companies";
import { EmptyState, FilterBar, Modal, PageFrame } from "@/components/chrome";
import { CompanyForm } from "@/components/company-form";
import { TagChips } from "@/components/tag-chip";
import { compactFieldClass, compactLabelClass } from "@/components/widgets";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const search = await searchParams;
  const lang = user.uiLanguage;
  const requested = firstParam(search.following);
  const following = requested === "all" || requested === "0" ? requested : "1";
  const [companies, catalog] = await Promise.all([
    prisma.company.findMany({
      where: {
        userId: user.id,
        ...(following === "1" ? { following: true } : following === "0" ? { following: false } : {}),
      },
      orderBy: { name: "asc" },
      include: { _count: { select: { jobs: true, contacts: true } }, tags: { include: { tag: true } } },
    }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  const closeHref = `/companies${preserveQuery(search, {}, ["modal"])}`;
  return (
    <PageFrame lang={lang} title={t(lang, "companies")} description={t(lang, "companiesIntro")} search={search}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <FilterBar className="mb-0 min-w-0 grow" legend={t(lang, "filters")}>
          <div className="flex flex-wrap items-end gap-2">
            <label className="w-48 min-w-0">
              <span className={compactLabelClass}>{t(lang, "following")}</span>
              <select className={compactFieldClass} name="following" defaultValue={following}>
                <option value="1">{t(lang, "following")}</option>
                <option value="all">{t(lang, "all")}</option>
                <option value="0">{t(lang, "notFollowing")}</option>
              </select>
            </label>
            <button className="rounded bg-sky-500 px-2 py-0.5 text-xs font-semibold leading-tight text-slate-950" type="submit">
              {t(lang, "apply")}
            </button>
          </div>
        </FilterBar>
        <Link
          className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950"
          href={`/companies${preserveQuery(search, { modal: "new" }, ["modal"])}`}
        >
          {t(lang, "addCompany")}
        </Link>
      </div>
      {companies.length === 0 ? (
        <EmptyState>{t(lang, "emptyCompanies")}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-3 py-2">{t(lang, "company")}</th>
                <th className="px-3 py-2">{t(lang, "tags")}</th>
                <th className="px-3 py-2">{t(lang, "dateFounded")}</th>
                <th className="px-3 py-2">{t(lang, "employeeCount")}</th>
                <th className="px-3 py-2">{t(lang, "offices")}</th>
                <th className="px-3 py-2">{t(lang, "jobs")}</th>
                <th className="px-3 py-2">{t(lang, "contacts")}</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    <Link className="text-sky-300" href={`/companies/${company.id}`}>
                      {dash(company.name, hide)}
                    </Link>
                  </td>
                  <td className="px-3 py-2"><TagChips tags={assignmentTags(company.tags)} hide={hide} /></td>
                  <td className="px-3 py-2">{company.foundedOn || "—"}</td>
                  <td className="px-3 py-2">{company.employeeCount ? companySizeLabel(lang, company.employeeCount) : "—"}</td>
                  <td className="px-3 py-2">{dash(company.offices, hide)}</td>
                  <td className="px-3 py-2">{company._count.jobs}</td>
                  <td className="px-3 py-2">{company._count.contacts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {firstParam(search.modal) === "new" ? (
        <Modal title={t(lang, "addCompany")} closeHref={closeHref} closeLabel={t(lang, "close")}>
          <CompanyForm action={createCompany} lang={lang} hide={hide} tags={catalog} />
        </Modal>
      ) : null}
    </PageFrame>
  );
}
