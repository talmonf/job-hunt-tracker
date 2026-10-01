import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !webhookSecret) return new Response("Stripe is not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret);
  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits);
    if (session.payment_status === "paid" && userId && Number.isInteger(credits) && credits > 0) {
      try {
        await prisma.$transaction([
          prisma.creditLedger.create({
            data: { userId, delta: credits, kind: "purchase", stripeSessionId: session.id, note: session.id },
          }),
          prisma.user.update({ where: { id: userId }, data: { creditBalance: { increment: credits } } }),
        ]);
      } catch (error) {
        const known = error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
        if (!known) throw error;
      }
    }
  }
  return new Response("ok");
}
