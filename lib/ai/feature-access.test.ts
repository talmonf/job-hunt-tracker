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

  it("uses a built-in key that is checked for the user", () => {
    assert.equal(sponsoredProvider(() => true, []), null);
    assert.equal(sponsoredProvider(() => true, ["anthropic"]), "anthropic");
    assert.equal(sponsoredProvider((provider) => provider === "google", ["anthropic"]), null);
    assert.equal(sponsoredProvider(() => true, ["google", "anthropic"]), "google");
    assert.equal(
      sponsoredProvider((provider) => provider === "openai" || provider === "anthropic", ["openai", "anthropic"]),
      "openai",
    );
    assert.equal(sponsoredProvider(() => true, ["openrouter"]), null);
  });
});
