import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { dateInputValue, formatDateTime } from "@/lib/dates";
import { eventTypeLabel, t } from "@/lib/i18n";
import { dash, maskText } from "@/lib/mask";
import { deleteContact, updateContact } from "@/lib/actions/network";
import { saveEvent } from "@/lib/actions/jobs";
import { PageFrame } from "@/components/chrome";
import { EventForm } from "@/components/event-form";
import { ContactFields } from "@/components/contact-fields";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const { id } = await params;
  const contact = await prisma.contact.findFirst({
    where: { id, userId: user.id },
    include: { events: { orderBy: { occurredAt: "desc" }, include: { job: true, noteVersion: { include: { note: true } } } } },
  });
  if (!contact) notFound();
  const [jobs, contacts, versions] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { companyName: "asc" } }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { fullName: "asc" } }),
    prisma.noteVersion.findMany({ where: { note: { userId: user.id } }, include: { note: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const lang = user.uiLanguage;
  return (
    <PageFrame lang={lang} backHref="/contacts" title={dash(contact.fullName, hide)} description={t(lang, "contactDetailIntro")}>
      <ContactFields
        lang={lang}
        action={updateContact}
        contact={contact}
        contactedAt={contact.contactedAt ? dateInputValue(contact.contactedAt, user.timezone) : ""}
        nextActionDate={contact.nextActionDate ? dateInputValue(contact.nextActionDate, user.timezone) : ""}
      />
      <h2 className="mb-2 mt-8 text-lg">{t(lang, "logEvent")}</h2>
      <EventForm
        action={saveEvent}
        lang={lang}
        calendarLinked={Boolean(user.calendarRefreshToken)}
        defaultContactId={contact.id}
        jobs={jobs.map((job) => ({ id: job.id, label: dash(`${job.companyName}${job.title ? ` — ${job.title}` : ""}`, hide) }))}
        contacts={contacts.map((item) => ({ id: item.id, label: dash(item.fullName, hide) }))}
        notes={versions.map((item) => ({ id: item.id, label: maskText(`${item.note.title} v${item.version}`, hide) }))}
        cvs={[]}
      />
      <h2 className="mb-2 mt-8 text-lg">{t(lang, "history")}</h2>
      <ol className="space-y-2 text-sm">
        {contact.events.map((event) => (
          <li key={event.id} className="rounded-md border border-slate-700 p-3">
            <div>{eventTypeLabel(lang, event.type)} · {formatDateTime(event.occurredAt, user.timezone)}</div>
            {event.job ? <div>{dash(event.job.companyName, hide)}</div> : null}
            {event.summary ? <p className="whitespace-pre-wrap text-slate-300">{dash(event.summary, hide)}</p> : null}
          </li>
        ))}
      </ol>
      <form action={deleteContact} className="mt-6">
        <input type="hidden" name="contactId" value={contact.id} />
        <button className="text-sm text-rose-300" type="submit">{t(lang, "delete")}</button>
      </form>
    </PageFrame>
  );
}
