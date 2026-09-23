export type PasswordRule = "length" | "lower" | "upper" | "digit";

export function passwordRule(password: string): PasswordRule | null {
  if (password.length < 8 || password.length > 128) return "length";
  if (!/[a-z]/.test(password)) return "lower";
  if (!/[A-Z]/.test(password)) return "upper";
  if (!/[0-9]/.test(password)) return "digit";
  return null;
}

export function passwordMaxAgeMonths(): number {
  const raw = Number(process.env.PASSWORD_MAX_AGE_MONTHS ?? "6");
  if (!Number.isInteger(raw) || raw < 1 || raw > 120) return 6;
  return raw;
}

export function addCalendarMonths(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();
  const hours = from.getUTCHours();
  const minutes = from.getUTCMinutes();
  const seconds = from.getUTCSeconds();
  const ms = from.getUTCMilliseconds();
  const target = new Date(Date.UTC(year, month + months, 1, hours, minutes, seconds, ms));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

export function passwordExpired(passwordChangedAt: Date | null, now = new Date()): boolean {
  if (!passwordChangedAt) return false;
  return now.getTime() > addCalendarMonths(passwordChangedAt, passwordMaxAgeMonths()).getTime();
}

export function passwordActionRequired(user: {
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  passwordHash: string | null;
}): boolean {
  if (!user.passwordHash) return false;
  return user.mustChangePassword || passwordExpired(user.passwordChangedAt);
}
