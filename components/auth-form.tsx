"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { ruleText, t } from "@/lib/i18n";
import { googleSignIn, login, signUp } from "@/lib/actions/auth";
import { fieldClass, labelClass, PasswordFieldLabeled, SubmitButton } from "./widgets";

export function AuthForm({
  mode,
  lang,
  callbackUrl,
  google,
  error,
  rule,
  fixedLanguage = false,
  home = false,
  onSwitch,
}: {
  mode: "login" | "signup";
  lang: Lang;
  callbackUrl: string;
  google: boolean;
  error: string;
  rule: string;
  fixedLanguage?: boolean;
  home?: boolean;
  onSwitch?: () => void;
}) {
  const [current, setCurrent] = useState<Lang>(lang);
  const [email, setEmail] = useState("");

  useEffect(() => {
    setCurrent(lang);
  }, [lang]);

  useEffect(() => {
    if (fixedLanguage || !email.includes("@")) return;
    const handle = setTimeout(() => {
      fetch(`/api/login-language?email=${encodeURIComponent(email)}`)
        .then((response) => response.json())
        .then((data: { lang?: Lang }) => {
          if (data.lang === "en" || data.lang === "he") setCurrent(data.lang);
        })
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
  }, [email, fixedLanguage]);

  const message =
    error === "policy" && (rule === "length" || rule === "lower" || rule === "upper" || rule === "digit")
      ? ruleText(current, rule)
      : error === "required"
        ? t(current, "errorRequired")
        : error
          ? t(current, "authError")
          : "";

  return (
    <div dir={current === "he" ? "rtl" : "ltr"} className="mx-auto w-full max-w-md rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
      {message ? <p className="mb-3 rounded-md border border-rose-700 px-3 py-2 text-start text-sm text-rose-200">{message}</p> : null}
      <form action={mode === "login" ? login : signUp} className="grid gap-3">
        {home ? <input type="hidden" name="surface" value="home" /> : null}
        <input type="hidden" name="ui_language" value={current} />
        {mode === "login" ? <input type="hidden" name="callbackUrl" value={callbackUrl} /> : null}
        {mode === "signup" ? (
          <label>
            <span className={labelClass}>{t(current, "fullName")}</span>
            <input className={fieldClass} name="fullName" required />
          </label>
        ) : null}
        <label>
          <span className={labelClass}>{t(current, "email")}</span>
          <input className={fieldClass} name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <PasswordFieldLabeled name="password" label={t(current, "password")} show={t(current, "show")} hide={t(current, "hide")} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        <div className="flex justify-center">
          <SubmitButton label={mode === "login" ? t(current, "signIn") : t(current, "signUp")} />
        </div>
      </form>
      {google ? (
        <>
          <div className="relative my-4">
            <div className="absolute inset-x-0 top-1/2 border-t border-slate-600" aria-hidden />
            <p className="relative mx-auto w-fit bg-slate-900 px-3 text-xs font-semibold text-slate-400">{t(current, "or")}</p>
          </div>
          <form action={googleSignIn}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button
              className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-[#4285F4] bg-white px-4 py-2 text-sm font-medium text-[#3c4043] hover:bg-slate-50"
              type="submit"
            >
              <GoogleMark />
              {t(current, "google")}
            </button>
          </form>
        </>
      ) : null}
      <p className="mt-3 text-start text-sm text-slate-300">
        {mode === "login" ? (
          <>
            {t(current, "needAccount")}{" "}
            {home && onSwitch ? (
              <button className="text-sky-300" type="button" onClick={onSwitch}>
                {t(current, "signUp")}
              </button>
            ) : (
              <Link className="text-sky-300" href={authPath("/signup", current, callbackUrl)}>
                {t(current, "signUp")}
              </Link>
            )}
          </>
        ) : (
          <>
            {t(current, "haveAccount")}{" "}
            {home && onSwitch ? (
              <button className="text-sky-300" type="button" onClick={onSwitch}>
                {t(current, "signIn")}
              </button>
            ) : (
              <Link className="text-sky-300" href={authPath("/login", current, callbackUrl)}>
                {t(current, "signIn")}
              </Link>
            )}
          </>
        )}
      </p>
    </div>
  );
}

function authPath(path: "/login" | "/signup", lang: Lang, callbackUrl: string) {
  const params = new URLSearchParams({ lang });
  if (callbackUrl && callbackUrl !== "/dashboard") params.set("callbackUrl", callbackUrl);
  return `${path}?${params.toString()}`;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.083 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
