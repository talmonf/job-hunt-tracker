import { headers } from "next/headers";
import { requireUser, hidePersonalInfo } from "@/lib/session";
import { AppHeader } from "@/components/header";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const hide = await hidePersonalInfo();
  const headerStore = await headers();
  const path = headerStore.get("x-pathname") || headerStore.get("next-url") || "/dashboard";
  return (
    <div dir={user.uiLanguage === "he" ? "rtl" : "ltr"}>
      <AppHeader lang={user.uiLanguage} hide={hide} name={user.fullName} role={user.role} path={path} />
      <main className="mx-auto max-w-[1400px] px-4 py-4">{children}</main>
    </div>
  );
}
