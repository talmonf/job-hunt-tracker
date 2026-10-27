import { pruneActivity } from "@/lib/activity";
import { runNotifications } from "@/lib/notifications";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || header !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const prunedActivity = await pruneActivity();
  const result = await runNotifications();
  return Response.json({ ...result, prunedActivity });
}
