import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { platformGrantAllows } from "./platform-access";

describe("platform key grants", () => {
  it("allows only a built-in provider that was granted", () => {
    const granted = ["google"];
    assert.equal(platformGrantAllows("google", granted), true);
    assert.equal(platformGrantAllows("anthropic", granted), false);
    assert.equal(platformGrantAllows("openai", granted), false);
    assert.equal(platformGrantAllows("openrouter", ["openrouter"]), false);
  });
});
