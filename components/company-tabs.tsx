"use client";

import { useState, type ReactNode } from "react";

export function CompanyTabs({
  initial,
  tabs,
  panels,
}: {
  initial: string;
  tabs: { id: string; label: string }[];
  panels: Record<string, ReactNode>;
}) {
  const [tab, setTab] = useState(initial);

  function select(id: string) {
    setTab(id);
    const url = new URL(window.location.href);
    if (id === "details") url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-slate-700" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === item.id ? "border-sky-400 text-sky-200" : "border-transparent text-slate-300"}`}
            type="button"
            role="tab"
            id={`company-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`company-panel-${item.id}`}
            onClick={() => select(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tabs.map((item) => (
        <div
          key={item.id}
          className="mt-4"
          role="tabpanel"
          id={`company-panel-${item.id}`}
          aria-labelledby={`company-tab-${item.id}`}
          hidden={tab !== item.id}
        >
          {panels[item.id]}
        </div>
      ))}
    </div>
  );
}
