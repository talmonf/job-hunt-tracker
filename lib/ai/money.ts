export function shekelsToAgorot(value: string): number | null {
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export function formatIls(agorot: number): string {
  const sign = agorot < 0 ? "-" : "";
  const abs = Math.abs(agorot);
  const shekels = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}₪${shekels}.${fraction}`;
}

export function providerCostAgorot(input: {
  inputTokens: number;
  outputTokens: number;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  usdToIls: number;
}): number {
  const usd =
    (Math.max(0, input.inputTokens) * input.inputUsdPerMillion +
      Math.max(0, input.outputTokens) * input.outputUsdPerMillion) /
    1_000_000;
  return Math.ceil(usd * input.usdToIls * 100);
}

export function creditDebitAgorot(providerAgorot: number, markupPercent: number): number {
  if (providerAgorot <= 0) return 0;
  const percent = Number.isFinite(markupPercent) ? markupPercent : 0;
  return Math.ceil((providerAgorot * (100 + percent)) / 100);
}
