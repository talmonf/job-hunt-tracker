import nodemailer from "nodemailer";

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!smtpConfigured()) return false;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
  });
  return true;
}
