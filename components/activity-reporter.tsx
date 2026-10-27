"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { clickTarget, controlFromTag, normalizePath } from "@/lib/audit-path";

const CLICKABLE = "a, button, [role='button'], input[type='submit'], summary";

function send(event: { kind: "page" | "click"; path: string; control?: string; target?: string }) {
  const body = JSON.stringify({ events: [event] });
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon("/api/audit", new Blob([body], { type: "application/json" }));
    if (sent) return;
  }
  void fetch("/api/audit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function ActivityReporter() {
  const pathname = usePathname();
  const lastPage = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPage.current) return;
    lastPage.current = pathname;
    const path = normalizePath(pathname);
    if (!path) return;
    send({ kind: "page", path });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const node = event.target instanceof Element ? event.target : null;
      const el = node?.closest(CLICKABLE);
      if (!el) return;
      const control = controlFromTag(el.tagName, el.getAttribute("type"), el.getAttribute("role"));
      if (!control) return;
      const path = normalizePath(window.location.pathname);
      if (!path) return;
      if (control === "link") {
        const href = el.getAttribute("href") ?? "";
        send({ kind: "click", path, control, target: clickTarget(href, path, window.location.origin) });
        return;
      }
      send({ kind: "click", path, control, target: path });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
