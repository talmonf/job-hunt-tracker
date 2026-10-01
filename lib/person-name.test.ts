import assert from "node:assert/strict";
import test from "node:test";
import { formatContactAddress, normalizeGooglePerson } from "./google-person";
import { assignNameByScript, bilingualNameFromGoogle, joinPersonName, namePartsFromPerson, splitPersonName } from "./person-name";

test("splits and joins a person name on the first space", () => {
  assert.deepEqual(splitPersonName("  Benny   Ben Sasson "), { firstName: "Benny", lastName: "Ben Sasson" });
  assert.deepEqual(splitPersonName("Benny"), { firstName: "Benny", lastName: "" });
  assert.equal(joinPersonName(" Benny ", "Ben Sasson"), "Benny Ben Sasson");
  assert.equal(joinPersonName("", ""), "");
});

test("prefers Google given and family names", () => {
  assert.deepEqual(
    namePartsFromPerson({ givenName: "Benny", familyName: "Ben Sasson", displayName: "Benny Ben Sasson" }),
    { firstName: "Benny", lastName: "Ben Sasson" },
  );
  assert.deepEqual(
    namePartsFromPerson({ givenName: "", familyName: "Ben Sasson", displayName: "Benny Ben Sasson" }),
    { firstName: "Benny", lastName: "Ben Sasson" },
  );
});

test("sorts a display name into English or Hebrew fields", () => {
  assert.deepEqual(assignNameByScript("Benny Ben Sasson"), {
    firstName: "Benny",
    lastName: "Ben Sasson",
    firstNameHe: "",
    lastNameHe: "",
  });
  assert.deepEqual(assignNameByScript("בני בן ששון"), {
    firstName: "",
    lastName: "",
    firstNameHe: "בני",
    lastNameHe: "בן ששון",
  });
});

test("fills English and Hebrew names from Google when both exist", () => {
  assert.deepEqual(
    bilingualNameFromGoogle([
      {
        givenName: "Benny",
        familyName: "Ben Sasson",
        phoneticGivenName: "בני",
        phoneticFamilyName: "בן ששון",
      },
    ]),
    { firstName: "Benny", lastName: "Ben Sasson", firstNameHe: "בני", lastNameHe: "בן ששון" },
  );
  assert.deepEqual(
    bilingualNameFromGoogle([
      { givenName: "בני", familyName: "בן ששון", metadata: { primary: true } },
      { givenName: "Benny", familyName: "Ben Sasson" },
    ]),
    { firstName: "Benny", lastName: "Ben Sasson", firstNameHe: "בני", lastNameHe: "בן ששון" },
  );
  assert.deepEqual(
    bilingualNameFromGoogle([{ displayName: "בני בן ששון", phoneticFullName: "Benny Ben Sasson" }]),
    { firstName: "Benny", lastName: "Ben Sasson", firstNameHe: "בני", lastNameHe: "בן ששון" },
  );
  assert.deepEqual(bilingualNameFromGoogle([{ givenName: "Benny", familyName: "Ben Sasson" }]), {
    firstName: "Benny",
    lastName: "Ben Sasson",
    firstNameHe: "",
    lastNameHe: "",
  });
});

test("google person fields used by the contact form", () => {
  const person = normalizeGooglePerson({
    resourceName: "people/c123",
    names: [{ displayName: "Benny Ben Sasson", givenName: "Benny", familyName: "Ben Sasson" }],
    organizations: [{ name: "MentMe", title: "Advisor", current: true }],
    urls: [{ value: "https://example.com" }, { value: "www.linkedin.com/in/benny-ben-sasson-cyber-management/" }],
    emailAddresses: [{ value: "other@example.com" }, { value: "benny@example.com", metadata: { primary: true } }],
    phoneNumbers: [{ value: "03-0000000", type: "work" }, { value: "050-0000000", type: "mobile" }],
    addresses: [{ city: "תל אביב", country: "Israel", countryCode: "IL" }],
  });
  assert.ok(person);
  assert.equal(person.workplace, "MentMe");
  assert.equal(person.title, "Advisor");
  assert.equal(person.linkedinUrl, "https://www.linkedin.com/in/benny-ben-sasson-cyber-management/");
  assert.equal(person.email, "benny@example.com");
  assert.equal(person.mobile, "050-0000000");
  assert.equal(person.address, "תל אביב");
  assert.equal(person.firstName, "Benny");
  assert.equal(person.lastName, "Ben Sasson");
  assert.equal(person.firstNameHe, "");
  assert.equal(person.lastNameHe, "");
});

test("formats a non-Israeli address as city, state, country", () => {
  assert.equal(
    formatContactAddress({ city: "Austin", region: "Texas", country: "United States", countryCode: "US" }),
    "Austin, Texas, United States",
  );
  assert.equal(formatContactAddress({ city: "London", country: "United Kingdom" }), "London, United Kingdom");
  assert.equal(formatContactAddress({ formattedValue: "חיפה\nישראל", countryCode: "IL" }), "חיפה");
});
