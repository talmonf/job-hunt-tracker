import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { ActivityReporter } from "@/components/activity-reporter";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Job Hunt Tracker",
  description: "Track companies, applications, interviews, and networking.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <Providers>
          {children}
          {signedIn ? <ActivityReporter /> : null}
        </Providers>
      </body>
    </html>
  );
}
