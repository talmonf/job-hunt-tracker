const secret = process.env.CRON_SECRET;
const url = process.env.APP_URL || "http://127.0.0.1:3000";
if (!secret) {
  console.error("CRON_SECRET is required");
  process.exit(1);
}

async function tick() {
  const response = await fetch(`${url}/api/cron/notifications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log(new Date().toISOString(), response.status);
}

await tick();
setInterval(() => {
  tick().catch((error) => console.error(error));
}, 15 * 60 * 1000);
