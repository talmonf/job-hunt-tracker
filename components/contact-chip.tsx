import Link from "next/link";
import { chipHref, chipOpensInApp, type ChipLink } from "@/lib/entity-links";
import { dash } from "@/lib/mask";

export function ContactChip({
  link,
  hide,
}: {
  link: ChipLink;
  hide: boolean;
}) {
  const name = dash(link.displayName, hide);
  const title = link.title ? dash(link.title, hide) : "";
  const tooltip = [name, title && title !== "—" ? title : ""].filter(Boolean).join(" · ");
  const href = chipHref(link);
  const label = title && title !== "—" ? `${name}` : name;
  const className =
    "group relative inline-flex max-w-full items-center rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-sm text-sky-200 hover:border-sky-500";
  const inner = (
    <>
      <span className="truncate">{label}</span>
      {tooltip ? (
        <span className="pointer-events-none absolute start-0 top-full z-20 mt-1 hidden max-w-xs whitespace-normal rounded-md border border-slate-600 bg-slate-900 p-2 text-xs text-slate-100 shadow-lg group-hover:block">
          <span className="block font-medium">{name}</span>
          {title && title !== "—" ? <span className="mt-0.5 block text-slate-300">{title}</span> : null}
        </span>
      ) : null}
    </>
  );
  if (!href) {
    return <span className={className}>{inner}</span>;
  }
  if (chipOpensInApp(link)) {
    return (
      <Link className={className} href={href} title={tooltip}>
        {inner}
      </Link>
    );
  }
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer" title={tooltip}>
      {inner}
    </a>
  );
}
