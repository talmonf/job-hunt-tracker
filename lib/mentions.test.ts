import assert from "node:assert/strict";
import test from "node:test";
import {
  chipHref,
  googleContactsUrl,
  isHttpUrl,
  isLinkedInUrl,
  kindFromUrl,
} from "./entity-links";
import {
  mentionHref,
  mentionToken,
  parseMentionToken,
  parseTarget,
  parseTextParts,
} from "./mentions";

test("google person urls drop the people/ prefix", () => {
  assert.equal(googleContactsUrl("people/c123"), "https://contacts.google.com/person/c123");
  assert.equal(googleContactsUrl("otherContacts/c123"), "https://contacts.google.com/person/c123");
  assert.equal(googleContactsUrl("c123"), "https://contacts.google.com/person/c123");
});

test("linkedin detection only accepts http(s) linkedin hosts", () => {
  assert.equal(isLinkedInUrl("https://www.linkedin.com/in/jane"), true);
  assert.equal(isLinkedInUrl("https://linkedin.com/in/jane"), true);
  assert.equal(kindFromUrl("https://docs.google.com/document/d/abc"), "url");
  assert.equal(isLinkedInUrl("https://evil.com/linkedin.com/in/jane"), false);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(kindFromUrl("not-a-url"), null);
});

test("mention tokens encode local, google, and url targets", () => {
  assert.equal(mentionToken("Jane Doe", { kind: "local_contact", contactId: "abc" }), "[[Jane Doe|contact:abc]]");
  assert.equal(
    mentionToken("Jane Doe", { kind: "google_contact", googleResourceName: "people/c123" }),
    "[[Jane Doe|google:people/c123]]",
  );
  assert.equal(
    mentionToken("Jane Doe", { kind: "linkedin", url: "https://www.linkedin.com/in/jane" }),
    "[[Jane Doe|https://www.linkedin.com/in/jane]]",
  );
});

test("parse mention tokens and reject unsafe targets", () => {
  assert.deepEqual(parseMentionToken("[[Jane Doe|contact:abc]]"), {
    displayName: "Jane Doe",
    target: { kind: "local_contact", contactId: "abc" },
  });
  assert.deepEqual(parseTarget("google:people/c123"), {
    kind: "google_contact",
    googleResourceName: "people/c123",
  });
  assert.equal(parseTarget("google:../etc"), null);
  assert.equal(parseTarget("javascript:alert(1)"), null);
});

test("text parser turns mentions and raw urls into parts", () => {
  const parts = parseTextParts(
    "Prep with [[Jane Doe|contact:abc]] and https://docs.google.com/document/d/xyz plus [[Pat|https://www.linkedin.com/in/pat]].",
  );
  assert.equal(parts.length, 7);
  assert.deepEqual(parts[0], { type: "text", value: "Prep with " });
  assert.equal(parts[1].type, "mention");
  if (parts[1].type === "mention") {
    assert.equal(parts[1].token.displayName, "Jane Doe");
    assert.equal(mentionHref(parts[1].token), "/contacts/abc");
  }
  assert.deepEqual(parts[2], { type: "text", value: " and " });
  assert.deepEqual(parts[3], { type: "url", url: "https://docs.google.com/document/d/xyz" });
  assert.deepEqual(parts[4], { type: "text", value: " plus " });
  assert.equal(parts[5].type, "mention");
  if (parts[5].type === "mention") {
    assert.equal(parts[5].token.displayName, "Pat");
    assert.equal(mentionHref(parts[5].token), "https://www.linkedin.com/in/pat");
  }
  assert.deepEqual(parts[6], { type: "text", value: "." });
});

test("local chips link in-app and google chips open Contacts", () => {
  assert.equal(
    chipHref({ kind: "local_contact", displayName: "Jane", title: "Recruiter", contactId: "abc" }),
    "/contacts/abc",
  );
  assert.equal(
    chipHref({
      kind: "google_contact",
      displayName: "Jane",
      title: "Recruiter",
      googleResourceName: "people/c123",
    }),
    "https://contacts.google.com/person/c123",
  );
});
