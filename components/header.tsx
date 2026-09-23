import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { maskText } from "@/lib/mask";
import { setObfuscate, setUserLanguage, signOutAction } from "@/lib/actions/auth";
import { LanguageSwitch, ObfuscateToggle, SignOutButton } from "./widgets";

const links = [
  ["/settings", "settings"],
  ["/profile", "profile"],
  ["/dashboard", "dashboard"],
  ["/jobs", "jobs"],
  ["/notes", "notes"],
  ["/contacts", "networking"],
] as const;

export function AppHeader({
  lang,
  hide,
  name,
  role,
  path,
}: {
  lang: Lang;
  hide: boolean;
  name: string;
  role: "user" | "admin";
  path: string;
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
        <Link className="text-lg font-semibold text-white" href="/dashboard">
          {t(lang, "appName")}
        </Link>
        <nav className="flex flex-wrap gap-1">
          {links.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-3 py-1 text-sm ${path.startsWith(href) ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white"}`}
            >
              {t(lang, key)}
            </Link>
          ))}
          {role === "admin" ? (
            <Link
              href="/admin/users"
              className={`rounded-full px-3 py-1 text-sm ${path.startsWith("/admin") ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-900"}`}
            >
              {t(lang, "users")}
            </Link>
          ) : null}
        </nav>
        <div className="ms-auto flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-300">
            {t(lang, "signedInAs")} {maskText(name, hide)}
            {role === "admin" ? <span className="ms-2 rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-100">{t(lang, "admin")}</span> : null}
          </span>
          <LanguageSwitch action={setUserLanguage} lang={lang} returnTo={path} />
          <ObfuscateToggle action={setObfuscate} hide={hide} label={t(lang, "hideInfo")} returnTo={path} />
          <Link className="text-sm text-slate-300 hover:text-white" href="/change-password">
            {t(lang, "changePassword")}
          </Link>
          <SignOutButton action={signOutAction} label={t(lang, "signOut")} confirm={t(lang, "signOutConfirm")} />
        </div>
      </div>
    </header>
  );
}
