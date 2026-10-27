import assert from "node:assert/strict";
import test from "node:test";
import { clickTarget, controlFromTag, normalizePath, parseActivityEvent } from "./audit-path";

const CUID = "clh2k3m4n5o6p7q8r9s0t1u2v3";
const UUID = "550e8400-e29b-41d4-a716-446655440000";

test("id segments become :id and query strings drop", () => {
  assert.equal(normalizePath(`/jobs/${CUID}?email=a@b.com`), "/jobs/:id");
  assert.equal(normalizePath(`/notes/${UUID}#section`), "/notes/:id");
  assert.equal(normalizePath("/admin/ai-usage"), "/admin/ai-usage");
  assert.equal(normalizePath("/jobs/new"), "/jobs/new");
  assert.equal(normalizePath("/jobs/:id"), "/jobs/:id");
});

test("paths that could carry an address or a traversal are rejected", () => {
  assert.equal(normalizePath("/contacts?q=ada@example.com"), "/contacts");
  assert.equal(normalizePath("/contacts/ada@example.com"), null);
  assert.equal(normalizePath("/jobs/../admin"), null);
  assert.equal(normalizePath("https://example.com/jobs"), null);
  assert.equal(normalizePath("/api/audit"), null);
  assert.equal(normalizePath(`/${"ab".repeat(80)}-${"cd".repeat(30)}`), null);
});

test("link targets keep in-app paths and drop external addresses", () => {
  const origin = "https://tracker.example";
  assert.equal(clickTarget(`/contacts/${CUID}?x=1`, "/dashboard", origin), "/contacts/:id");
  assert.equal(
    clickTarget(`https://tracker.example/jobs/${UUID}?token=secret`, "/dashboard", origin),
    "/jobs/:id",
  );
  assert.equal(clickTarget("https://linkedin.com/in/someone", "/contacts", origin), "external");
  assert.equal(clickTarget("mailto:ada@example.com", "/contacts", origin), "external");
  assert.equal(clickTarget("tel:+15551212", "/contacts", origin), "external");
  assert.equal(clickTarget("javascript:alert(1)", "/dashboard", origin), "external");
  assert.equal(clickTarget("#details", "/jobs/:id", origin), "/jobs/:id");
});

test("click records keep control type and a normalized target", () => {
  assert.equal(controlFromTag("BUTTON", "submit", null), "submit");
  assert.equal(controlFromTag("A", null, null), "link");
  assert.equal(controlFromTag("DIV", null, "button"), "button");
  const button = parseActivityEvent({
    kind: "click",
    path: `/jobs/${CUID}`,
    control: "button",
    target: "Delete Ada",
  });
  assert.deepEqual(button, { kind: "click", path: "/jobs/:id", control: "button", target: "/jobs/:id" });
  const link = parseActivityEvent({
    kind: "click",
    path: "/contacts",
    control: "link",
    target: "mailto:ada@example.com",
  });
  assert.equal(link, null);
  const external = parseActivityEvent({
    kind: "click",
    path: "/contacts",
    control: "link",
    target: "external",
  });
  assert.deepEqual(external, { kind: "click", path: "/contacts", control: "link", target: "external" });
  const page = parseActivityEvent({ kind: "page", path: `/companies/${CUID}?q=1`, control: "button", target: "secret" });
  assert.deepEqual(page, { kind: "page", path: "/companies/:id", control: "", target: "" });
});
