import ExcelJS from "exceljs";
import type { Channel, MeetingStage } from "@prisma/client";
import { prisma } from "./prisma";
import { excelSerialToUtcDate, wallClockToUtc, addDays, formatDate } from "./dates";
import { recomputeJobStatus } from "./job-status";

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
      include: { job: true, noteVersion: true },
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
      contact.status,
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
      formatDate(interview.occurredAt, timeZone),
      interview.stage ?? "",
      interview.summary,
      "",
      "",
      interview.noteVersion?.bodyHe || interview.noteVersion?.bodyEn || "",
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
      data.searchMinutesOverride = daily == null ? null : toMinutes(daily);
    } else if (task.includes("תרגול")) data.interviewPracticeMinutesPerDay = daily == null ? 0 : toMinutes(daily);
    else if (task.includes("למידה")) data.learningMinutesPerDay = daily == null ? 0 : toMinutes(daily);
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
    const company = textOf(row.getCell(header.columns.company ?? 1).value).trim();
    if (!company) continue;
    const title = textOf(row.getCell(header.columns.title ?? 2).value).trim();
    const interest = parseDate(row.getCell(header.columns.date ?? 3).value, timeZone) ?? new Date();
    const how = textOf(row.getCell(header.columns.how ?? 5).value);
    const tailored = yesNo(row.getCell(header.columns.tailored ?? 6).value);
    const response = textOf(row.getCell(header.columns.response ?? 7).value);
    const notes = textOf(row.getCell(header.columns.notes ?? 10).value);
    const description = textOf(row.getCell(header.columns.description ?? 11).value);
    const reply = textOf(row.getCell(header.columns.reply ?? 12).value);
    const importKey = `mentme:job:${company.toLowerCase()}:${title.toLowerCase()}`;
    const followUpAt = addDays(interest, 7);
    const job = await prisma.job.upsert({
      where: { userId_importKey: { userId, importKey } },
      create: {
        userId,
        companyName: company,
        title,
        description,
        interestDate: interest,
        followUpAt,
        importKey,
      },
      update: {
        companyName: company,
        title,
        description,
        interestDate: interest,
      },
    });
    jobs += 1;
    const urls = uniqueUrls(`${description}\n${notes}\n${how}\n${reply}`);
    if (urls.length) {
      await prisma.jobUrl.deleteMany({ where: { jobId: job.id } });
      await prisma.jobUrl.createMany({ data: urls.map((url) => ({ jobId: job.id, url })) });
    }
    const eventKey = `mentme:application:${importKey}`;
    const rejected = /לא עברתי|reject|דחי/i.test(response);
    const summary = [how, notes, reply].filter(Boolean).join("\n");
    const existing = await prisma.event.findUnique({ where: { userId_importKey: { userId, importKey: eventKey } } });
    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: { summary, tailoredCv: tailored, occurredAt: interest, resultingStatus: rejected ? "rejected" : "applied" },
      });
    } else {
      await prisma.event.create({
        data: {
          userId,
          jobId: job.id,
          type: "application",
          occurredAt: interest,
          resultingStatus: rejected ? "rejected" : "applied",
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
    const fullName = textOf(row.getCell(header.columns.name ?? 1).value).trim();
    if (!fullName) continue;
    const workplace = textOf(row.getCell(header.columns.workplace ?? 3).value).trim();
    const importKey = `mentme:contact:${fullName.toLowerCase()}:${workplace.toLowerCase()}`;
    const data = {
      fullName,
      role: textOf(row.getCell(header.columns.role ?? 2).value),
      workplace,
      howWeMet: textOf(row.getCell(header.columns.source ?? 4).value),
      lastChannel: textOf(row.getCell(header.columns.channel ?? 5).value),
      status: textOf(row.getCell(header.columns.status ?? 6).value),
      summary: textOf(row.getCell(header.columns.summary ?? 7).value),
      contactedAt: parseDate(row.getCell(header.columns.contacted ?? 8).value, timeZone),
      nextActionDate: parseDate(row.getCell(header.columns.nextDate ?? 10).value, timeZone),
      nextAction: textOf(row.getCell(header.columns.nextAction ?? 11).value),
      contactDetails: textOf(row.getCell(header.columns.details ?? 12).value),
      willingToRecommend: yesNo(row.getCell(header.columns.recommend ?? 13).value) === true,
    };
    await prisma.contact.upsert({
      where: { userId_importKey: { userId, importKey } },
      create: { userId, importKey, ...data },
      update: data,
    });
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
    const company = textOf(row.getCell(header.columns.company ?? 1).value).trim();
    if (!company) continue;
    const title = textOf(row.getCell(header.columns.interviewTitle ?? 2).value).trim();
    const when = parseDate(row.getCell(header.columns.interviewDate ?? 3).value, timeZone) ?? new Date();
    const kind = textOf(row.getCell(header.columns.interviewType ?? 4).value);
    const summary = textOf(row.getCell(header.columns.overall ?? 5).value);
    const positives = textOf(row.getCell(header.columns.positives ?? 6).value);
    const negatives = textOf(row.getCell(header.columns.negatives ?? 7).value);
    const lessons = textOf(row.getCell(header.columns.lessons ?? 8).value);
    const notes = textOf(row.getCell(header.columns.interviewNotes ?? 15).value);
    const importKey = `mentme:job:${company.toLowerCase()}:${title.toLowerCase()}`;
    const job = await prisma.job.upsert({
      where: { userId_importKey: { userId, importKey } },
      create: {
        userId,
        companyName: company,
        title,
        interestDate: when,
        followUpAt: addDays(when, 7),
        importKey,
      },
      update: {},
    });
    const bodyHe = [
      summary && `סיכום: ${summary}`,
      positives && `נקודות חיוביות: ${positives}`,
      negatives && `פחות טוב: ${negatives}`,
      lessons && `לקחים: ${lessons}`,
      notes && `הערות: ${notes}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const eventKey = `mentme:interview:${company.toLowerCase()}:${title.toLowerCase()}:${when.toISOString().slice(0, 10)}`;
    const existing = await prisma.event.findUnique({ where: { userId_importKey: { userId, importKey: eventKey } } });
    if (existing?.noteVersionId) {
      await prisma.noteVersion.update({ where: { id: existing.noteVersionId }, data: { bodyHe } });
      await prisma.event.update({
        where: { id: existing.id },
        data: { summary, occurredAt: when, stage: interviewStage(kind) },
      });
    } else if (!existing) {
      const note = await prisma.note.create({
        data: {
          userId,
          title: `סיכום ראיון: ${company}`,
          versions: { create: { version: 1, bodyHe } },
        },
        include: { versions: true },
      });
      await prisma.event.create({
        data: {
          userId,
          jobId: job.id,
          type: "meeting",
          occurredAt: when,
          resultingStatus: "interviewing",
          stage: interviewStage(kind),
          summary,
          noteVersionId: note.versions[0]?.id,
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
      if (name === "הערות") columns.notes = col;
      if (name.includes("תיאור התפקיד")) columns.description = col;
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
      if (name.includes("הוספת פידבק")) columns.interviewNotes = col;
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

function toMinutes(value: number): number {
  if (value > 0 && value < 1) return Math.round(value * 24 * 60);
  return Math.round(value * 60);
}

function textOf(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "richText" in value) return value.richText.map((part) => part.text).join("");
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text;
  if (typeof value === "object" && "result" in value) return textOf(value.result as ExcelJS.CellValue);
  if (typeof value === "object" && "formula" in value) return "";
  return "";
}

function parseDate(value: ExcelJS.CellValue, timeZone: string): Date | null {
  const raw = value && typeof value === "object" && "result" in value ? (value.result as ExcelJS.CellValue) : value;
  if (raw instanceof Date) return raw;
  if (typeof raw === "number" && raw > 20000) {
    const utc = excelSerialToUtcDate(raw);
    const iso = utc.toISOString().slice(0, 10);
    return wallClockToUtc(`${iso}T00:00`, timeZone);
  }
  if (typeof raw === "string") {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
    if (match) return wallClockToUtc(`${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}T00:00`, timeZone);
  }
  return null;
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
  return [...new Set(found)];
}

function interviewStage(kind: string): MeetingStage {
  const text = kind.toLowerCase();
  if (text.includes("hr") || text.includes("אישיות")) return "hr";
  if (text.includes("טכני") || text.includes("technical")) return "technical";
  if (text.includes("סופי") || text.includes("final")) return "final";
  if (text.includes("מנהל") || text.includes("manager")) return "manager";
  return "other";
}

export function channelFromText(value: string): Channel | null {
  const text = value.toLowerCase();
  if (text.includes("whatsapp") || text.includes("וואטסאפ")) return "whatsapp";
  if (text.includes("inmail")) return "linkedin_inmail";
  if (text.includes("mail") || text.includes("מייל") || text.includes("אימייל")) return "email";
  if (text.includes("phone") || text.includes("טלפון")) return "phone";
  return null;
}
