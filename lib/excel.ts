import ExcelJS from "exceljs";
import type { JobStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { addLocalDays, formatDate, localDateString } from "./dates";
import { recomputeJobStatus } from "./job-status";
import { normalizeContactStatus } from "./contact-status";
import { contactStatusLabel } from "./i18n";
import { assignNameByScript } from "./person-name";
import { ensureCompany } from "./companies";
import { copyCompanyTags } from "./tag-assign";
import {
  applicationOutcome,
  applicationSummary,
  channelFromText,
  followUpNoteFromReminder,
  hoursToMinutes,
  interviewNoteBody,
  interviewStage,
  isTerminalJobStatus,
  parseImportedDate,
  splitContactDetails,
} from "./excel-map";

export { channelFromText } from "./excel-map";

const SHEET_GOALS = "הגדרת יעדים";
const SHEET_JOBS = "ניהול הגשת מועמדויות";
const SHEET_CONTACTS = "מעקב נטוורקינג";
const SHEET_INTERVIEWS = 'דו"ח ראיון עבודה';

export async function importWorkbook(userId: string, buffer: Buffer, timeZone: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let jobs = 0;
  let contacts = 0;
  let events = 0;
  let goals = 0;

  const goalsSheet = findSheet(workbook, ["יעדים"]);
  if (goalsSheet) {
    goals += await importGoals(user.id, goalsSheet);
  }
  const jobsSheet = findSheet(workbook, ["מועמדויות"]);
  if (jobsSheet) {
    const result = await importJobs(user.id, jobsSheet, timeZone);
    jobs += result.jobs;
    events += result.events;
  }
  const contactsSheet = findSheet(workbook, ["נטוורקינג"]);
  if (contactsSheet) {
    contacts += await importContacts(user.id, contactsSheet, timeZone);
  }
  const interviewSheet = findSheet(workbook, ["ראיון"]);
  if (interviewSheet) {
    events += await importInterviews(user.id, interviewSheet, timeZone);
  }
  if (!goalsSheet && !jobsSheet && !contactsSheet && !interviewSheet) {
    throw new Error("import");
  }
  return { jobs, contacts, events, goals };
}

export async function exportWorkbook(userId: string, timeZone: string): Promise<Buffer> {
  const [goals, jobs, contacts, interviews] = await Promise.all([
    prisma.userGoals.findUnique({ where: { userId } }),
    prisma.job.findMany({
      where: { userId },
      include: { urls: true, events: { orderBy: { occurredAt: "asc" } } },
      orderBy: { interestDate: "asc" },
    }),
    prisma.contact.findMany({ where: { userId }, orderBy: { fullName: "asc" } }),
    prisma.event.findMany({
      where: { userId, type: "meeting" },
      include: { job: true, note: true },
      orderBy: { occurredAt: "asc" },
    }),
  ]);
  const workbook = new ExcelJS.Workbook();

  const goalSheet = workbook.addWorksheet(SHEET_GOALS);
  goalSheet.addRow(["משימות", "יעד יומי", "יעד שבועי (לא למלא את עמודה זו)"]);
  goalSheet.addRow(["לכמה משרות אוכל להגיש מועמדות בכל יום?", goals?.applicationsPerDay ?? "", ""]);
  goalSheet.addRow([
    "לכמה אנשים אוכל לפנות בכל יום כדי להרחיב את מעגל הנטוורקינג שלי?",
    goals?.networkingPerDay ?? "",
    goals?.networkingPerWeek ?? "",
  ]);
  goalSheet.addRow(["כמה שעות אוכל להקדיש לחיפוש עבודה בכל יום?", goals?.searchMinutesOverride != null ? goals.searchMinutesOverride / 60 : "", ""]);
  goalSheet.addRow(["כמה זמן אוכל להקדיש לתרגול ראיונות עבודה ביום?", goals?.interviewPracticeMinutesPerDay ? goals.interviewPracticeMinutesPerDay / 60 : "", ""]);
  goalSheet.addRow(["כמה זמן אקדיש ביום ללמידה וחיזוק הכישורים המקצועיים שלי?", goals?.learningMinutesPerDay ? goals.learningMinutesPerDay / 60 : "", ""]);
  goalSheet.addRow(['סה"כ זמן השקעה שבועי לפיתוח הקריירה', "", ""]);

  const jobSheet = workbook.addWorksheet(SHEET_JOBS);
  jobSheet.addRow(["", "", "", "", "", "", "", "במקרה שעברו יותר משבועיים מהריאיון ולא קיבלתי עדיין עדכון"]);
  jobSheet.addRow([
    "שם החברה שאליה הגשתי מועמדות",
    "התפקיד שאליו הגשתי ",
    "תאריך הגשה",
    "כמה זמן עבר מאז הגשת המועמדות",
    "איך הגשתי",
    'האם התאמתי את קו"ח לתיאור המשרה?',
    "מה הייתה התשובה שקיבלתי?",
    "שלחתי מייל תזכורת?",
    "קיבלתי עדכון?",
    "הערות",
    'טקסט של תיאור התפקיד ("העתק הדבק")',
    '"העתק הדבק" לתשובה שקיבלתי',
  ]);
  for (const job of jobs) {
    const application = job.events.find((event) => event.type === "application");
    const rejected = job.status === "rejected";
    jobSheet.addRow([
      job.companyName,
      job.title,
      formatDate(job.interestDate, timeZone),
      "",
      application?.summary ?? "",
      application?.tailoredCv ? "כן" : application ? "לא" : "",
      rejected ? "לא עברתי" : "",
      "",
      "",
      job.urls.map((url) => url.url).join("\n"),
      job.description,
      "",
    ]);
  }

  const contactSheet = workbook.addWorksheet(SHEET_CONTACTS);
  contactSheet.addRow([
    "למי פניתי (שם מלא)?",
    "תפקיד איש הקשר",
    "מקום העבודה\n של איש הקשר",
    "מקור ההיכרות",
    "כיצד פניתי אליו/אליה?",
    "סטטוס הפנייה",
    "סיכום קצר של השיחה/המפגש (אם רלוונטי)",
    "תאריך יצירת הקשר",
    "כמה ימים חלפו מאז הפנייה",
    "תאריך הפעולה הבאה",
    "פעולת המשך",
    "פרטי התקשרות",
    "מוכנ/ה להמליץ עליי?",
  ]);
  for (const contact of contacts) {
    contactSheet.addRow([
      contact.fullName,
      contact.role,
      contact.workplace,
      contact.howWeMet,
      contact.lastChannel,
      contactStatusLabel("he", contact.status) || contact.status,
      contact.summary,
      contact.contactedAt ? formatDate(contact.contactedAt, timeZone) : "",
      "",
      contact.nextActionDate ? formatDate(contact.nextActionDate, timeZone) : "",
      contact.nextAction,
      contact.contactDetails,
      contact.willingToRecommend ? "כן" : "לא",
    ]);
  }

  const interviewSheet = workbook.addWorksheet(SHEET_INTERVIEWS);
  interviewSheet.addRow(["", "", "", "", "ניתוח הריאיון"]);
  interviewSheet.addRow([
    "שם החברה",
    "התפקיד שאליו התראיינתי",
    "מועד הריאיון",
    "סוג הריאיון",
    "סיכום כללי של החוויה מהריאיון",
    "נקודות חיוביות מהריאיון",
    "דברים שפחות הלכו לי טוב בריאיון",
    "מסקנות והפקת לקחים לפעמים הבאות בנקודות",
    "שלחתי הודעת תודה לאחר הריאיון?",
    "שלחתי מייל תזכורת?",
    "האם קיבלתי עדכון?",
    "האם קיבלתי פידבק?",
    "לא קיבלתי פידבק. האם ביקשתי לקבל?",
    "האם הודיתי על ההזדמנות בנימוס?",
    "הערות + הוספת פידבק במקרה של דחייה",
  ]);
  for (const interview of interviews) {
    interviewSheet.addRow([
      interview.job?.companyName ?? "",
      interview.job?.title ?? "",
      formatDate(interview.startsAt ?? interview.occurredAt, timeZone),
      interview.stage ?? "",
      interview.summary,
      "",
      "",
      interview.note?.bodyHe || interview.note?.bodyEn || "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
  }

  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data);
}

async function importGoals(userId: string, sheet: ExcelJS.Worksheet) {
  const data: {
    applicationsPerDay?: number;
    networkingPerDay?: number | null;
    networkingPerWeek?: number | null;
    interviewPracticeMinutesPerDay?: number;
    learningMinutesPerDay?: number;
    searchMinutesOverride?: number | null;
  } = {};
  sheet.eachRow((row) => {
    const task = normalize(textOf(row.getCell(1).value));
    if (!task || task === "משימות") return;
    const daily = literalNumber(row.getCell(2));
    const weekly = literalNumber(row.getCell(3));
    if (task.includes("משרות")) data.applicationsPerDay = daily ?? 0;
    else if (task.includes("נטוורקינג")) {
      data.networkingPerDay = daily;
      data.networkingPerWeek = weekly;
    } else if (task.includes("שעות") && task.includes("חיפוש")) {
      data.searchMinutesOverride = daily == null ? null : hoursToMinutes(daily, row.getCell(2).numFmt ?? "");
    } else if (task.includes("תרגול")) data.interviewPracticeMinutesPerDay = daily == null ? 0 : hoursToMinutes(daily, row.getCell(2).numFmt ?? "");
    else if (task.includes("למידה")) data.learningMinutesPerDay = daily == null ? 0 : hoursToMinutes(daily, row.getCell(2).numFmt ?? "");
  });
  if (Object.keys(data).length === 0) return 0;
  await prisma.userGoals.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return 1;
}

async function importJobs(userId: string, sheet: ExcelJS.Worksheet, timeZone: string) {
  const header = findHeader(sheet, "שם החברה");
  if (!header) return { jobs: 0, events: 0 };
  let jobs = 0;
  let events = 0;
  for (let rowNumber = header.row + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const company = importedText(row.getCell(header.columns.company ?? 1).value);
    if (!company) continue;
    const title = importedText(row.getCell(header.columns.title ?? 2).value);
    const interest = parseDate(row.getCell(header.columns.date ?? 3).value, timeZone) ?? new Date();
    const how = importedText(row.getCell(header.columns.how ?? 5).value);
    const tailored = yesNo(row.getCell(header.columns.tailored ?? 6).value);
    const response = importedText(row.getCell(header.columns.response ?? 7).value);
    const reminder = columnText(row, header.columns.reminder);
    const gotUpdate = columnText(row, header.columns.gotUpdate);
    const notes = importedText(row.getCell(header.columns.notes ?? 10).value);
    const description = importedText(row.getCell(header.columns.description ?? 11).value);
    const reply = importedText(row.getCell(header.columns.reply ?? 12).value);
    const importKey = `mentme:job:${company.toLowerCase()}:${title.toLowerCase()}`;
    const linked = await ensureCompany(prisma, userId, company);
    if (!linked) continue;
    const existed = await prisma.job.findUnique({ where: { userId_importKey: { userId, importKey } }, select: { id: true } });
    const followUpAt = addLocalDays(interest, 7, timeZone);
    const followUpNote = followUpNoteFromReminder(reminder);
    const job = await prisma.job.upsert({
      where: { userId_importKey: { userId, importKey } },
      create: {
        userId,
        companyId: linked.id,
        companyName: linked.name,
        title,
        description,
        interestDate: interest,
        followUpAt,
        followUpNote,
        importKey,
      },
      update: {
        companyId: linked.id,
        companyName: linked.name,
        title,
        description,
        interestDate: interest,
        followUpAt,
        ...(followUpNote ? { followUpNote } : {}),
      },
    });
    if (!existed) await copyCompanyTags("job", job.id, [linked.id]);
    jobs += 1;
    const urls = uniqueUrls(`${description}\n${notes}\n${how}\n${reply}`);
    if (urls.length) {
      await prisma.jobUrl.deleteMany({ where: { jobId: job.id } });
      await prisma.jobUrl.createMany({ data: urls.map((url) => ({ jobId: job.id, url })) });
    }
    const eventKey = `mentme:application:${importKey}`;
    const resultingStatus = applicationOutcome(response) ?? "applied";
    const summary = applicationSummary({ how, response, gotUpdate, notes, reply });
    const existing = await prisma.event.findUnique({ where: { userId_importKey: { userId, importKey: eventKey } } });
    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: { summary, tailoredCv: tailored, occurredAt: interest, resultingStatus },
      });
    } else {
      await prisma.event.create({
        data: {
          userId,
          jobId: job.id,
          type: "application",
          occurredAt: interest,
          resultingStatus,
          summary,
          tailoredCv: tailored,
          importKey: eventKey,
        },
      });
      events += 1;
    }
    await recomputeJobStatus(job.id);
  }
  return { jobs, events };
}

async function importContacts(userId: string, sheet: ExcelJS.Worksheet, timeZone: string) {
  const header = findHeader(sheet, "למי פניתי");
  if (!header) return 0;
  let count = 0;
  for (let rowNumber = header.row + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const fullName = importedText(row.getCell(header.columns.name ?? 1).value);
    if (!fullName) continue;
    const workplace = importedText(row.getCell(header.columns.workplace ?? 3).value);
    const importKey = `mentme:contact:${fullName.toLowerCase()}:${workplace.toLowerCase()}`;
    const names = assignNameByScript(fullName);
    const details = splitContactDetails(importedText(row.getCell(header.columns.details ?? 12).value));
    const data = {
      fullName,
      firstName: names.firstName,
      lastName: names.lastName,
      firstNameHe: names.firstNameHe,
      lastNameHe: names.lastNameHe,
      role: importedText(row.getCell(header.columns.role ?? 2).value),
      workplace,
      howWeMet: importedText(row.getCell(header.columns.source ?? 4).value),
      lastChannel: importedText(row.getCell(header.columns.channel ?? 5).value),
      status: normalizeContactStatus(importedText(row.getCell(header.columns.status ?? 6).value)),
      summary: importedText(row.getCell(header.columns.summary ?? 7).value),
      contactedAt: parseDate(row.getCell(header.columns.contacted ?? 8).value, timeZone),
      nextActionDate: parseDate(row.getCell(header.columns.nextDate ?? 10).value, timeZone),
      nextAction: importedText(row.getCell(header.columns.nextAction ?? 11).value),
      contactDetails: details.contactDetails,
      email: details.email,
      mobile: details.mobile,
      linkedinUrl: details.linkedinUrl,
      willingToRecommend: yesNo(row.getCell(header.columns.recommend ?? 13).value) === true,
    };
    const existed = await prisma.contact.findUnique({ where: { userId_importKey: { userId, importKey } }, select: { id: true } });
    const contact = await prisma.contact.upsert({
      where: { userId_importKey: { userId, importKey } },
      create: { userId, importKey, ...data },
      update: data,
    });
    const company = await ensureCompany(prisma, userId, workplace);
    if (company) {
      await prisma.contactCompany.upsert({
        where: { contactId_companyId: { contactId: contact.id, companyId: company.id } },
        create: { contactId: contact.id, companyId: company.id },
        update: {},
      });
      if (!existed) await copyCompanyTags("contact", contact.id, [company.id]);
    }
    count += 1;
  }
  return count;
}

async function importInterviews(userId: string, sheet: ExcelJS.Worksheet, timeZone: string) {
  const header = findHeader(sheet, "שם החברה");
  if (!header) return 0;
  let events = 0;
  for (let rowNumber = header.row + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const company = importedText(row.getCell(header.columns.company ?? 1).value);
    if (!company) continue;
    const title = importedText(row.getCell(header.columns.interviewTitle ?? 2).value);
    const when = parseDate(row.getCell(header.columns.interviewDate ?? 3).value, timeZone) ?? new Date();
    const kind = importedText(row.getCell(header.columns.interviewType ?? 4).value);
    const summary = importedText(row.getCell(header.columns.overall ?? 5).value);
    const positives = importedText(row.getCell(header.columns.positives ?? 6).value);
    const negatives = importedText(row.getCell(header.columns.negatives ?? 7).value);
    const lessons = importedText(row.getCell(header.columns.lessons ?? 8).value);
    const thankYou = columnText(row, header.columns.thankYou);
    const reminder = columnText(row, header.columns.reminder);
    const gotUpdate = columnText(row, header.columns.gotUpdate);
    const feedback = columnText(row, header.columns.feedback);
    const askedFeedback = columnText(row, header.columns.askedFeedback);
    const thanked = columnText(row, header.columns.thanked);
    const notes = columnText(row, header.columns.interviewNotes);
    const importKey = `mentme:job:${company.toLowerCase()}:${title.toLowerCase()}`;
    const linked = await ensureCompany(prisma, userId, company);
    if (!linked) continue;
    const existed = await prisma.job.findUnique({ where: { userId_importKey: { userId, importKey } }, select: { id: true } });
    const job = await prisma.job.upsert({
      where: { userId_importKey: { userId, importKey } },
      create: {
        userId,
        companyId: linked.id,
        companyName: linked.name,
        title,
        interestDate: when,
        followUpAt: addLocalDays(when, 7, timeZone),
        importKey,
      },
      update: {
        companyId: linked.id,
        companyName: linked.name,
      },
    });
    if (!existed) await copyCompanyTags("job", job.id, [linked.id]);
    const bodyHe = interviewNoteBody({
      kind,
      summary,
      positives,
      negatives,
      lessons,
      thankYou,
      reminder,
      gotUpdate,
      feedback,
      askedFeedback,
      thanked,
      notes,
    });
    const eventKey = `mentme:interview:${company.toLowerCase()}:${title.toLowerCase()}:${localDateString(when, timeZone)}`;
    const application = await prisma.event.findUnique({
      where: { userId_importKey: { userId, importKey: `mentme:application:${importKey}` } },
      select: { resultingStatus: true },
    });
    const meetingStatus: JobStatus | null = isTerminalJobStatus(application?.resultingStatus) ? null : "interviewing";
    const meeting = {
      summary,
      occurredAt: when,
      startsAt: when,
      stage: interviewStage(kind),
      channel: channelFromText(kind),
      resultingStatus: meetingStatus,
    };
    const existing = await prisma.event.findUnique({ where: { userId_importKey: { userId, importKey: eventKey } } });
    if (existing?.noteId) {
      await prisma.note.update({ where: { id: existing.noteId }, data: { bodyHe } });
      await prisma.event.update({ where: { id: existing.id }, data: meeting });
    } else if (existing) {
      const note = await prisma.note.create({
        data: {
          userId,
          title: `סיכום ראיון: ${company}`,
          jobId: job.id,
          type: "interview_debrief",
          bodyHe,
        },
      });
      await prisma.event.update({ where: { id: existing.id }, data: { ...meeting, noteId: note.id } });
    } else {
      const note = await prisma.note.create({
        data: {
          userId,
          title: `סיכום ראיון: ${company}`,
          jobId: job.id,
          type: "interview_debrief",
          bodyHe,
        },
      });
      await prisma.event.create({
        data: {
          userId,
          jobId: job.id,
          type: "meeting",
          ...meeting,
          noteId: note.id,
          importKey: eventKey,
        },
      });
      events += 1;
    }
    await recomputeJobStatus(job.id);
  }
  return events;
}

function findSheet(workbook: ExcelJS.Workbook, hints: string[]) {
  return workbook.worksheets.find((sheet) => hints.some((hint) => sheet.name.includes(hint)));
}

function findHeader(sheet: ExcelJS.Worksheet, firstHint: string): { row: number; columns: Record<string, number> } | null {
  let found: { row: number; columns: Record<string, number> } | null = null;
  sheet.eachRow((row, rowNumber) => {
    if (found || rowNumber > 6) return;
    const columns: Record<string, number> = {};
    row.eachCell((cell, col) => {
      const name = normalize(textOf(cell.value));
      if (!name) return;
      if (name.includes("שם החברה שאליה") || name === "שם החברה") columns.company = col;
      if (name.includes("התפקיד שאליו הגשתי")) columns.title = col;
      if (name.includes("תאריך הגשה")) columns.date = col;
      if (name.includes("איך הגשתי")) columns.how = col;
      if (name.includes("התאמתי")) columns.tailored = col;
      if (name.includes("התשובה שקיבלתי") && !name.includes("העתק")) columns.response = col;
      if (name.includes("מייל תזכורת")) columns.reminder = col;
      if (name.includes("קיבלתי עדכון")) columns.gotUpdate = col;
      if (name === "הערות" || (name.startsWith("הערות") && !name.includes("פידבק"))) columns.notes = col;
      if (name.includes("תיאור התפקיד") || (name.includes("תיאור המשרה") && name.includes("העתק"))) columns.description = col;
      if (name.includes("לתשובה שקיבלתי")) columns.reply = col;
      if (name.includes("למי פניתי")) columns.name = col;
      if (name.includes("תפקיד איש הקשר")) columns.role = col;
      if (name.includes("מקום העבודה")) columns.workplace = col;
      if (name.includes("מקור ההיכרות")) columns.source = col;
      if (name.includes("כיצד פניתי")) columns.channel = col;
      if (name.includes("סטטוס הפנייה")) columns.status = col;
      if (name.includes("סיכום קצר")) columns.summary = col;
      if (name.includes("תאריך יצירת הקשר")) columns.contacted = col;
      if (name.includes("תאריך הפעולה הבאה")) columns.nextDate = col;
      if (name.includes("פעולת המשך")) columns.nextAction = col;
      if (name.includes("פרטי התקשרות")) columns.details = col;
      if (name.includes("להמליץ")) columns.recommend = col;
      if (name.includes("התפקיד שאליו התראיינתי")) columns.interviewTitle = col;
      if (name.includes("מועד הריאיון") || name.includes("מועד הראיון")) columns.interviewDate = col;
      if (name.includes("סוג הריאיון") || name.includes("סוג הראיון")) columns.interviewType = col;
      if (name.includes("סיכום כללי")) columns.overall = col;
      if (name.includes("חיוביות")) columns.positives = col;
      if (name.includes("פחות הלכו")) columns.negatives = col;
      if (name.includes("לקחים")) columns.lessons = col;
      if (name.includes("הודעת תודה")) columns.thankYou = col;
      if (name.includes("ביקשתי")) columns.askedFeedback = col;
      if (name.includes("קיבלתי פידבק") && !name.includes("ביקשתי") && !name.includes("הוספת")) columns.feedback = col;
      if (name.includes("הודיתי")) columns.thanked = col;
      if (name.includes("הוספת פידבק") || (name.includes("הערות") && name.includes("פידבק"))) columns.interviewNotes = col;
    });
    if (Object.keys(columns).length >= 3 && normalize(textOf(row.getCell(1).value)).includes(normalize(firstHint))) {
      found = { row: rowNumber, columns };
    }
  });
  return found;
}

function literalNumber(cell: ExcelJS.Cell): number | null {
  const raw = cell.value;
  if (raw && typeof raw === "object" && "formula" in raw) return null;
  const value = raw && typeof raw === "object" && "result" in raw ? raw.result : raw;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function textOf(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "richText" in value) {
    const text = value.richText.map((part) => part.text).join("");
    const hyperlink = "hyperlink" in value && typeof value.hyperlink === "string" ? value.hyperlink : "";
    if (hyperlink && !text.includes(hyperlink)) return `${text} ${hyperlink}`.trim();
    return text;
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    const hyperlink = "hyperlink" in value && typeof value.hyperlink === "string" ? value.hyperlink : "";
    if (!hyperlink || hyperlink === value.text) return value.text;
    return `${value.text} ${hyperlink}`.trim();
  }
  if (typeof value === "object" && "hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink;
  if (typeof value === "object" && "result" in value) return textOf(value.result as ExcelJS.CellValue);
  if (typeof value === "object" && "formula" in value) return "";
  return "";
}

function importedText(value: ExcelJS.CellValue): string {
  const text = textOf(value).trim();
  if (text === "true") return "כן";
  if (text === "false") return "לא";
  return text;
}

function columnText(row: ExcelJS.Row, column: number | undefined): string {
  if (!column) return "";
  return importedText(row.getCell(column).value);
}

function parseDate(value: ExcelJS.CellValue, timeZone: string): Date | null {
  return parseImportedDate(value, timeZone);
}

function yesNo(value: ExcelJS.CellValue): boolean | null {
  const text = normalize(textOf(value)).toLowerCase();
  if (["כן", "yes", "true", "1"].includes(text)) return true;
  if (["לא", "no", "false", "0"].includes(text)) return false;
  return null;
}

function normalize(value: string): string {
  return value.replace(/[״"]/g, '"').replace(/\s+/g, " ").trim();
}

function uniqueUrls(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s)]+/g) ?? [];
  return [...new Set(found.map((url) => url.replace(/[.,;:]+$/, "")))];
}
