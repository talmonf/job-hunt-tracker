import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireAdmin } from "@/lib/session";
import { firstParam, preserveQuery } from "@/lib/http";
import { ruleText, t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { createUser, resetUserPassword, setUserActive } from "@/lib/actions/admin";
import { EmptyState, Modal, PageFrame } from "@/components/chrome";
import { PasswordFieldLabeled, SubmitButton, fieldClass, labelClass } from "@/components/widgets";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const hide = await hidePersonalInfo();
  const search = await searchParams;
  const lang = admin.uiLanguage;
  const q = firstParam(search.q);
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { email: "asc" },
  });
  const resetId = firstParam(search.id);
  const rule = firstParam(search.rule);
  return (
    <PageFrame lang={lang} title={t(lang, "users")} description={t(lang, "usersIntro")} search={search}>
      {firstParam(search.error) === "policy" && (rule === "length" || rule === "lower" || rule === "upper" || rule === "digit") ? (
        <p className="mb-3 rounded-md border border-rose-700 px-3 py-2 text-sm text-rose-200">{ruleText(lang, rule)}</p>
      ) : null}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg">{t(lang, "users")}</h2>
        <a className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" href={`/admin/users${preserveQuery(search, { modal: "new" }, ["modal", "id"])}`}>
          {t(lang, "addUser")}
        </a>
      </div>
      <form className="mb-4" method="get">
        <fieldset className="rounded-lg border border-slate-700 p-3">
          <legend className="px-1 text-sm">{t(lang, "filters")}</legend>
          <input className={fieldClass} name="q" defaultValue={q} placeholder={t(lang, "search")} />
          <button className="mt-3 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950" type="submit">{t(lang, "apply")}</button>
        </fieldset>
      </form>
      {users.length === 0 ? (
        <EmptyState>{t(lang, "emptyUsers")}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-start text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-3 py-2">{t(lang, "fullName")}</th>
                <th className="px-3 py-2">{t(lang, "email")}</th>
                <th className="px-3 py-2">{t(lang, "roleLabel")}</th>
                <th className="px-3 py-2">{t(lang, "status")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">{dash(user.fullName, hide)}</td>
                  <td className="px-3 py-2">{dash(user.email, hide)}</td>
                  <td className="px-3 py-2">{user.role === "admin" ? t(lang, "adminRole") : t(lang, "userRole")}</td>
                  <td className="px-3 py-2">{user.isActive ? t(lang, "active") : t(lang, "inactive")}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      {user.id !== admin.id ? (
                        <form action={setUserActive}>
                          <input type="hidden" name="id" value={user.id} />
                          <input type="hidden" name="active" value={user.isActive ? "0" : "1"} />
                          <button className="text-sky-300" type="submit">{user.isActive ? t(lang, "deactivate") : t(lang, "activate")}</button>
                        </form>
                      ) : null}
                      <a className="text-sky-300" href={`/admin/users${preserveQuery(search, { modal: "reset", id: user.id }, ["modal", "id"])}`}>{t(lang, "resetPassword")}</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {firstParam(search.modal) === "new" ? (
        <Modal title={t(lang, "addUser")} closeHref="/admin/users" closeLabel={t(lang, "close")}>
          <form action={createUser} className="grid gap-3">
            <label><span className={labelClass}>{t(lang, "fullName")}</span><input className={fieldClass} name="fullName" required /></label>
            <label><span className={labelClass}>{t(lang, "email")}</span><input className={fieldClass} name="email" type="email" required /></label>
            <label>
              <span className={labelClass}>{t(lang, "roleLabel")}</span>
              <select className={fieldClass} name="role" defaultValue="user">
                <option value="user">{t(lang, "userRole")}</option>
                <option value="admin">{t(lang, "adminRole")}</option>
              </select>
            </label>
            <PasswordFieldLabeled name="password" label={t(lang, "initialPassword")} show={t(lang, "show")} hide={t(lang, "hide")} autoComplete="new-password" />
            <ul className="list-disc ps-5 text-xs text-slate-400">
              <li>{t(lang, "ruleLength")}</li>
              <li>{t(lang, "ruleLower")}</li>
              <li>{t(lang, "ruleUpper")}</li>
              <li>{t(lang, "ruleDigit")}</li>
            </ul>
            <SubmitButton label={t(lang, "save")} />
          </form>
        </Modal>
      ) : null}
      {firstParam(search.modal) === "reset" && resetId ? (
        <Modal title={t(lang, "resetPassword")} closeHref="/admin/users" closeLabel={t(lang, "close")}>
          <form action={resetUserPassword} className="grid gap-3">
            <input type="hidden" name="id" value={resetId} />
            <PasswordFieldLabeled name="password" label={t(lang, "newPassword")} show={t(lang, "show")} hide={t(lang, "hide")} autoComplete="new-password" />
            <SubmitButton label={t(lang, "save")} />
          </form>
        </Modal>
      ) : null}
    </PageFrame>
  );
}
