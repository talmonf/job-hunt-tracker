"use client";

import { useEffect, useState } from "react";
import { setLoginLanguage } from "@/lib/actions/auth";
import { t, type Lang } from "@/lib/i18n";
import { AuthForm } from "./auth-form";
import { LanguageSwitch } from "./widgets";

export function SplashActions({
  lang,
  google,
  error,
  rule,
  initialPanel,
}: {
  lang: Lang;
  google: boolean;
  error: string;
  rule: string;
  initialPanel: "login" | "signup" | null;
}) {
  const [panel, setPanel] = useState<"login" | "signup" | null>(initialPanel);
  useEffect(() => {
    setPanel(initialPanel);
  }, [initialPanel]);
  const returnTo = panel ? `/?panel=${panel}` : "/";
  const showError = panel !== null && panel === initialPanel;

  return (
    <div>
      <div className="mb-6" dir="ltr">
        <div className="flex justify-end">
          <LanguageSwitch action={setLoginLanguage} lang={lang} returnTo={returnTo} />
        </div>
        <h1 className="mt-2 text-center text-3xl font-semibold text-white sm:text-4xl">{t(lang, "appName")}</h1>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <button
          className={`flex-1 rounded-lg px-4 py-3 text-center text-base font-semibold text-slate-950 ${panel === "login" ? "bg-sky-400 ring-2 ring-sky-200" : "bg-sky-500 hover:bg-sky-400"}`}
          type="button"
          aria-expanded={panel === "login"}
          onClick={() => setPanel(panel === "login" ? null : "login")}
        >
          {t(lang, "splashLogin")}
        </button>
        <button
          className={`flex-1 rounded-lg px-4 py-3 text-center text-base font-semibold text-slate-950 ${panel === "signup" ? "bg-emerald-400 ring-2 ring-emerald-200" : "bg-emerald-500 hover:bg-emerald-400"}`}
          type="button"
          aria-expanded={panel === "signup"}
          onClick={() => setPanel(panel === "signup" ? null : "signup")}
        >
          {t(lang, "splashCreate")}
        </button>
      </div>
      {panel ? (
        <div className="mt-4" id="splash-auth">
          <AuthForm
            mode={panel}
            lang={lang}
            fixedLanguage
            home
            onSwitch={() => setPanel(panel === "login" ? "signup" : "login")}
            callbackUrl="/dashboard"
            google={google}
            error={showError ? error : ""}
            rule={showError ? rule : ""}
          />
        </div>
      ) : null}
    </div>
  );
}
