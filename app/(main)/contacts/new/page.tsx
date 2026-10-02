import { prisma } from "@/lib/prisma";
import { hidePersonalInfo, requireUser } from "@/lib/session";
import { t } from "@/lib/i18n";
import { dash } from "@/lib/mask";
import { assignFieldsByScript, displayPersonName, emptyBilingualName } from "@/lib/person-name";
import { createContact } from "@/lib/actions/network";
import { PageFrame } from "@/components/chrome";
import { ContactFields } from "@/components/contact-fields";

export const dynamic = "force-dynamic";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const search = await searchParams;
  const linkId = typeof search.link === "string" ? search.link : "";
  const lang = user.uiLanguage;
  const [link, contacts, catalog] = await Promise.all([
    linkId
      ? prisma.entityLink.findFirst({
          where: { id: linkId, userId: user.id, kind: "manual", jobId: { not: null } },
        })
      : Promise.resolve(null),
    prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        role: true,
        workplace: true,
        googleResourceName: true,
        linkedinUrl: true,
      },
    }),
    prisma.tag.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  const names = link ? assignFieldsByScript(link.firstName, link.lastName) : emptyBilingualName();
  const fullName = displayPersonName(names);
  const title = fullName ? dash(fullName, hide) : t(lang, "addContact");
  return (
    <PageFrame lang={lang} backHref="/contacts" title={title} description={t(lang, "contactDetailIntro")} search={search}>
      <ContactFields
        lang={lang}
        action={createContact}
        layout="page"
        entityLinkId={link?.id ?? ""}
        contact={{
          id: "",
          fullName: fullName || title,
          firstName: names.firstName,
          lastName: names.lastName,
          firstNameHe: names.firstNameHe,
          lastNameHe: names.lastNameHe,
          role: "",
          workplace: "",
          howWeMet: "",
          lastChannel: "",
          status: "",
          summary: "",
          nextAction: "",
          contactDetails: "",
          willingToRecommend: false,
          mobile: link?.phone ?? "",
          email: link?.email ?? "",
          address: "",
          linkedinUrl: "",
          googleResourceName: null,
        }}
        localContacts={contacts}
        googleConnected={Boolean(user.contactsRefreshToken)}
        tags={catalog}
        hide={hide}
      />
    </PageFrame>
  );
}
