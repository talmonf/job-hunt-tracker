import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creditDebitAgorot, formatIls, formatUsd, providerCostAgorot, providerCostUsdMicros, shekelsToAgorot } from "./money";

describe("ai money", () => {
  it("converts shekels to agorot", () => {
    assert.equal(shekelsToAgorot("10"), 1000);
    assert.equal(shekelsToAgorot("10.5"), 1050);
    assert.equal(shekelsToAgorot("0"), null);
  });

  it("formats a balance", () => {
    assert.equal(formatIls(1050), "₪10.50");
    assert.equal(formatIls(-20), "-₪0.20");
  });

  it("prices tokens in dollars and formats millionths", () => {
    assert.equal(
      providerCostUsdMicros({
        inputTokens: 1_000,
        outputTokens: 500,
        inputUsdPerMillion: 0.15,
        outputUsdPerMillion: 0.6,
      }),
      450,
    );
    assert.equal(
      providerCostUsdMicros({
        inputTokens: -5,
        outputTokens: 0,
        inputUsdPerMillion: 3,
        outputUsdPerMillion: 15,
      }),
      0,
    );
    assert.equal(formatUsd(450), "$0.000450");
    assert.equal(formatUsd(1_500_000), "$1.500000");
    assert.equal(formatUsd(-20), "-$0.000020");
  });

  it("prices tokens in agorot and applies markup only on the debit", () => {
    const provider = providerCostAgorot({
      inputTokens: 1_000_000,
      outputTokens: 0,
      inputUsdPerMillion: 1,
      outputUsdPerMillion: 0,
      usdToIls: 4,
    });
    assert.equal(provider, 400);
    assert.equal(creditDebitAgorot(provider, 25), 500);
    assert.equal(creditDebitAgorot(0, 25), 0);
  });
});
