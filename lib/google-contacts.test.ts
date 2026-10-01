import assert from "node:assert/strict";
import test from "node:test";
import { matchGooglePeople, mergeGooglePeople, peopleFromSearch } from "./google-contacts";

test("search results keep saved contacts and other contacts", () => {
  const people = peopleFromSearch({
    results: [
      { person: { resourceName: "people/c1", names: [{ displayName: "Chily Cohen" }] } },
      { person: { resourceName: "otherContacts/c2", names: [{ displayName: "Chily Adler" }] } },
      { person: { resourceName: "not-a-person", names: [{ displayName: "Skipped" }] } },
    ],
  });
  assert.deepEqual(
    people.map((person) => person.displayName),
    ["Chily Cohen", "Chily Adler"],
  );
});

test("directory matches are case-insensitive and merged by resource name", () => {
  const saved = peopleFromSearch({
    results: [{ person: { resourceName: "people/c1", names: [{ displayName: "Chily Cohen", givenName: "Chily", familyName: "Cohen" }] } }],
  });
  const again = peopleFromSearch({
    results: [{ person: { resourceName: "people/c1", emailAddresses: [{ value: "chily@example.com" }], names: [{ displayName: "Chily Cohen" }] } }],
  });
  const other = peopleFromSearch({
    results: [{ person: { resourceName: "people/c9", names: [{ displayName: "Someone Else" }] } }],
  });
  const merged = mergeGooglePeople([...saved, ...again, ...other]);
  assert.equal(merged.length, 2);
  assert.deepEqual(
    matchGooglePeople(merged, "CHILY").map((person) => person.resourceName),
    ["people/c1"],
  );
  assert.equal(matchGooglePeople(merged, "ad").length, 0);
});
