export const CONTACT_STATUSES = [
  "follow_up_needed",
  "conversation_held",
  "outreach_sent",
  "waiting",
  "closed",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

const aliases: Record<string, ContactStatus> = {
  follow_up_needed: "follow_up_needed",
  "follow-up required": "follow_up_needed",
  "follow up required": "follow_up_needed",
  "follow-up needed": "follow_up_needed",
  "נדרש פולואפ": "follow_up_needed",
  "נדרש פולואואפ": "follow_up_needed",
  conversation_held: "conversation_held",
  "conversation held": "conversation_held",
  "call held": "conversation_held",
  "התקיימה שיחה": "conversation_held",
  outreach_sent: "outreach_sent",
  "outreach sent": "outreach_sent",
  "נשלחה פנייה": "outreach_sent",
  "נשלחה פניה": "outreach_sent",
  waiting: "waiting",
  "waiting for reply": "waiting",
  "ממתין לתשובה": "waiting",
  closed: "closed",
  "סגור": "closed",
};

export function isContactStatus(value: string): value is ContactStatus {
  return (CONTACT_STATUSES as readonly string[]).includes(value);
}

export function normalizeContactStatus(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return aliases[trimmed] ?? aliases[trimmed.toLowerCase()] ?? trimmed;
}
