"use client";

import { useEffect, useState } from "react";
import { primaryButton } from "./widgets";

function formSignature(form: HTMLFormElement) {
  const parts: string[] = [];
  for (const [key, value] of new FormData(form).entries()) {
    parts.push(value instanceof File ? `${key}\0${value.name}\0${value.size}` : `${key}\0${value}`);
  }
  return parts.join("\n");
}

export function DirtyFormSave({
  formId,
  label,
  revision,
}: {
  formId: string;
  label: string;
  revision: string;
}) {
  const [seenRevision, setSeenRevision] = useState(revision);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  if (seenRevision !== revision) {
    setSeenRevision(revision);
    setDirty(false);
    setPending(false);
  }

  useEffect(() => {
    const found = document.getElementById(formId);
    if (!(found instanceof HTMLFormElement)) return;
    const form: HTMLFormElement = found;
    const baseline = formSignature(form);
    let frame = 0;
    function refresh() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = formSignature(form) !== baseline;
        setDirty((current) => (current === next ? current : next));
      });
    }
    function onEdit(event: Event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (form.contains(target) || target.closest(`[data-job-form-watch="${CSS.escape(formId)}"]`)) refresh();
    }
    function onSubmit() {
      setPending(true);
    }
    const observer = new MutationObserver(refresh);
    observer.observe(form, { childList: true, subtree: true });
    const seen = new Set<Element>();
    for (const el of document.querySelectorAll(`[data-job-form-watch="${CSS.escape(formId)}"]`)) {
      if (seen.has(el) || form.contains(el)) continue;
      seen.add(el);
      observer.observe(el, { childList: true, subtree: true });
    }
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    document.addEventListener("click", onEdit, true);
    form.addEventListener("submit", onSubmit);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
      document.removeEventListener("click", onEdit, true);
      form.removeEventListener("submit", onSubmit);
    };
  }, [formId, revision]);

  return (
    <button
      className={`${primaryButton} inline-flex items-center gap-2`}
      type="submit"
      form={formId}
      disabled={!dirty || pending}
      aria-busy={pending}
    >
      {pending ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      {label}
    </button>
  );
}
