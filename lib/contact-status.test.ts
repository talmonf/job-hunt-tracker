import assert from "node:assert/strict";
import test from "node:test";
import { normalizeContactStatus } from "./contact-status";
import { contactStatusLabel } from "./i18n";

test("known Hebrew contact statuses map to keys", () => {
  assert.equal(normalizeContactStatus("נדרש פולואפ"), "follow_up_needed");
  assert.equal(normalizeContactStatus("  התקיימה שיחה  "), "conversation_held");
});

test("English labels and keys normalize", () => {
  assert.equal(normalizeContactStatus("Follow-up required"), "follow_up_needed");
  assert.equal(normalizeContactStatus("follow_up_needed"), "follow_up_needed");
  assert.equal(normalizeContactStatus("Conversation held"), "conversation_held");
});

test("empty and unknown values are kept", () => {
  assert.equal(normalizeContactStatus(""), "");
  assert.equal(normalizeContactStatus("   "), "");
  assert.equal(normalizeContactStatus("custom"), "custom");
});

test("contact status labels follow the UI language", () => {
  assert.equal(contactStatusLabel("en", "נדרש פולואפ"), "Follow-up required");
  assert.equal(contactStatusLabel("en", "התקיימה שיחה"), "Conversation held");
  assert.equal(contactStatusLabel("he", "follow_up_needed"), "נדרש פולואפ");
  assert.equal(contactStatusLabel("en", ""), "");
});
