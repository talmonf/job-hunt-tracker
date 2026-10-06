import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fillAccess, isSponsoredFeature, sponsoredProvider } from "./feature-access";

describe("sponsored feature access", () => {
  it("prefers a sponsored feature over the user's own key", () => {
    assert.equal(fillAccess({ sponsored: true, hasOwnKey: true }), "sponsored");
    assert.equal(fillAccess({ sponsored: true, hasOwnKey: false }), "sponsored");
    assert.equal(fillAccess({ sponsored: false, hasOwnKey: true }), "ownKey");
    assert.equal(fillAccess({ sponsored: false, hasOwnKey: false }), "blocked");
  });

  it("grants only the user-facing features", () => {
    assert.equal(isSponsoredFeature("job-details"), true);
    assert.equal(isSponsoredFeature("import"), true);
    assert.equal(isSponsoredFeature("compare"), true);
    assert.equal(isSponsoredFeature("test"), false);
  });

  it("picks the first configured platform key in Google, OpenAI, Anthropic order", () => {
    assert.equal(sponsoredProvider(() => false), null);
    assert.equal(sponsoredProvider(() => true), "google");
    assert.equal(
      sponsoredProvider((provider) => provider === "openai" || provider === "anthropic"),
      "openai",
    );
    assert.equal(sponsoredProvider((provider) => provider === "anthropic"), "anthropic");
    assert.equal(sponsoredProvider((provider) => provider === "openrouter"), null);
  });
});
