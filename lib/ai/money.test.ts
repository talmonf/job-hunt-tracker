import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creditDebitAgorot, formatIls, providerCostAgorot, shekelsToAgorot } from "./money";

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
