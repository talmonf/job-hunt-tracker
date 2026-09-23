import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { passwordRule } from "../lib/password";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (!email || !password) return;
  const rule = passwordRule(password);
  if (rule) throw new Error(`SEED_ADMIN_PASSWORD failed policy: ${rule}`);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: "admin" } });
    return;
  }
  await prisma.user.create({
    data: {
      email,
      fullName: "Admin",
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      goals: { create: {} },
      profile: { create: {} },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
