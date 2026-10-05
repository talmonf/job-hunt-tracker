import { parseJsonObject } from "./json";
import { parseProfileText } from "./parse-profile";
import { needsModel, normalizeProposal, type OutputLanguage, type Proposal } from "./proposal";
import { chargeAndComplete } from "./run";
import type { AiProviderId } from "./providers";

const SYSTEM = `You turn CV and LinkedIn profile text into one JSON object for a job-hunt profile.
Return JSON only, with these keys:
headline, aboutEn, aboutHe,
employments: [{key,title,company,startDate,endDate,isCurrent,bullets:[{key,textEn,textHe}]}],
educations: [{key,school,degree,field,startDate,endDate}],
volunteers: [{key,organization,role,startDate,endDate,textEn,textHe}],
certificates: [{key,name,issuer,issuedOn,url}],
labels: [{key,kind,name}] where kind is "skill" or "theme",
flavors: [{key,name,employmentKeys,bulletKeys,labelKeys}],
conflicts: [{field,values}].
Dates are MM/YYYY, or YYYY when the source has no month. Leave the day out. Empty when unknown. isCurrent is boolean.
A flavor is a named emphasis on one history, listing which roles, bullets, and skill labels to feature. It is not a second biography.
When there is one source, leave flavors empty unless the document itself separates two emphases.
When there are several sources, build one canonical history and propose flavors from the differences.
labels must include skills and targeting themes. The reader will edit them.
conflicts lists fields where the sources disagree, with the distinct values.
Respect the requested output language. "en" fills English and leaves Hebrew empty. "he" does the opposite. "both" fills both, translating whatever is missing.
Do not invent employers, dates, or degrees that are not in the sources.`;

export async function buildProposal(input: {
  userId: string;
  texts: { filename: string; text: string }[];
  language: OutputLanguage;
  paySource: "key" | "credits";
  provider: AiProviderId;
}): Promise<Proposal> {
  const parsed = input.texts.map((file) => parseProfileText(file.text));
  const base = parsed[0] ?? normalizeProposal({});
  if (!needsModel(base, input.language, input.texts.length)) return base;
  const clipped = input.texts
    .map((file, index) => `SOURCE ${index + 1}: ${file.filename}\n${file.text.slice(0, 60_000)}`)
    .join("\n\n");
  const hint = parsed.map((proposal, index) => `PARSER ${index + 1}:\n${JSON.stringify(proposal)}`).join("\n\n");
  const completion = await chargeAndComplete({
    userId: input.userId,
    paySource: input.paySource,
    provider: input.provider,
    feature: input.texts.length > 1 ? "compare" : "import",
    system: SYSTEM,
    user: `Output language: ${input.language}\n\n${clipped}\n\n${hint}`,
    maxTokens: 8000,
    outputEstimate: 2500,
  });
  let parsedJson: unknown;
  try {
    parsedJson = parseJsonObject(completion.text);
  } catch {
    return { ...base, usedModel: true };
  }
  const proposal = normalizeProposal(parsedJson, true);
  if (proposal.employments.length === 0 && proposal.educations.length === 0 && base.employments.length + base.educations.length > 0) {
    return { ...base, usedModel: true, labels: proposal.labels.length ? proposal.labels : base.labels, flavors: proposal.flavors, conflicts: proposal.conflicts };
  }
  return proposal;
}
