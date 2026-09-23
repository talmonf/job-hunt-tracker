"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { ruleText, t } from "@/lib/i18n";
import { googleSignIn, login, signUp } from "@/lib/actions/auth";
import { fieldClass, labelClass, PasswordFieldLabeled, primaryButton, SubmitButton } from "./widgets";

export function AuthForm({
  mode,
  lang,
  callbackUrl,
  google,
  error,
  rule,
}: {
  mode: "login" | "signup";
  lang: Lang;
  callbackUrl: string;
  google: boolean;
  error: string;
  rule: string;
}) {
  const [current, setCurrent] = useState<Lang>(lang);
  const [email, setEmail] = useState("");

  useEffect(() => {
    setCurrent(lang);
  }, [lang]);

  useEffect(() => {
    if (!email.includes("@")) return;
    const handle = setTimeout(() => {
      fetch(`/api/login-language?email=${encodeURIComponent(email)}`)
        .then((response) => response.json())
        .then((data: { lang?: Lang }) => {
          if (data.lang === "en" || data.lang === "he") setCurrent(data.lang);
        })
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
  }, [email]);

  const message =
    error === "policy" && (rule === "length" || rule === "lower" || rule === "upper" || rule === "digit")
      ? ruleText(current, rule)
      : error === "required"
        ? t(current, "errorRequired")
        : error
          ? t(current, "authError")
          : "";

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-slate-900 p-4 ring-1 ring-slate-800">
      {message ? <p className="mb-3 rounded-md border border-rose-700 px-3 py-2 text-sm text-rose-200">{message}</p> : null}
      <form action={mode === "login" ? login : signUp} className="grid gap-3">
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
        <SubmitButton label={mode === "login" ? t(current, "signIn") : t(current, "signUp")} />
      </form>
      {google ? (
        <form action={googleSignIn} className="mt-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button className={`${primaryButton} w-full bg-slate-100`} type="submit">
            {t(current, "google")}
          </button>
        </form>
      ) : null}
      <p className="mt-3 text-sm text-slate-300">
        {mode === "login" ? (
          <>
            {t(current, "needAccount")}{" "}
            <Link className="text-sky-300" href="/signup">
              {t(current, "signUp")}
            </Link>
          </>
        ) : (
          <>
            {t(current, "haveAccount")}{" "}
            <Link className="text-sky-300" href="/login">
              {t(current, "signIn")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
