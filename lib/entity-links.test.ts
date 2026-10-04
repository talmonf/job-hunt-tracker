import assert from "node:assert/strict";
import test from "node:test";
import { linkIdentityFilters, sameLinkIdentity } from "./entity-links";

test("matches a person already linked by contact, Google resource, or URL", () => {
  assert.equal(sameLinkIdentity({ contactId: "c1" }, { contactId: "c1", googleResourceName: "people/other" }), true);
  assert.equal(sameLinkIdentity({ googleResourceName: "people/abc" }, { contactId: "c2", googleResourceName: "people/abc" }), true);
  assert.equal(sameLinkIdentity({ url: "https://linkedin.com/in/ada" }, { url: " https://linkedin.com/in/ada " }), true);
  assert.equal(sameLinkIdentity({ contactId: "c1" }, { contactId: "c2" }), false);
  assert.equal(sameLinkIdentity({ url: "" }, { url: "" }), false);
  assert.equal(sameLinkIdentity({ contactId: "  " }, { contactId: "  " }), false);
});

test("builds filters only for stable identities", () => {
  assert.deepEqual(linkIdentityFilters({ contactId: " c1 ", googleResourceName: "", url: " https://x.test " }), [
    { contactId: "c1" },
    { url: "https://x.test" },
  ]);
  assert.deepEqual(linkIdentityFilters({ contactId: null, googleResourceName: null, url: "" }), []);
});
