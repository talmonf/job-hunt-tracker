import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { maskText } from "@/lib/mask";
import { setObfuscate, setUserLanguage, signOutAction } from "@/lib/actions/auth";
import { LanguageSwitch, NavLinks, ObfuscateToggle, SignOutButton, UserMenu } from "./widgets";

const links = [
  ["/settings", "settings"],
  ["/profile", "profile"],
  ["/dashboard", "dashboard"],
  ["/jobs", "jobs"],
  ["/notes", "notes"],
  ["/contacts", "networking"],
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

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
          <NavLinks
            links={[
              ...links.map(([href, key]) => ({ href, label: t(lang, key) })),
              ...(role === "admin" ? [{ href: "/admin/users", label: t(lang, "users") }] : []),
            ]}
          />
        </nav>
        <div className="ms-auto flex flex-wrap items-center gap-3">
          <LanguageSwitch action={setUserLanguage} lang={lang} />
          <ObfuscateToggle action={setObfuscate} hide={hide} label={t(lang, "hideInfo")} />
          <UserMenu
            initials={hide ? "\u2022\u2022" : initials(name)}
            name={maskText(name, hide)}
            isAdmin={role === "admin"}
            adminLabel={t(lang, "admin")}
            changePasswordLabel={t(lang, "changePassword")}
          >
            <SignOutButton
              action={signOutAction}
              label={t(lang, "signOut")}
              confirm={t(lang, "signOutConfirm")}
              className="block w-full px-3 py-2 text-start text-sm text-slate-200 hover:bg-slate-800"
            />
          </UserMenu>
        </div>
      </div>
    </header>
  );
}
