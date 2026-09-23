# App design guideline

Use this when building a new product that should behave like the Home Finances app. Keep this product's own nouns, tables, and routes. Match the interaction.

This product has two kinds of account on one user table: a regular user and an admin. There is no tenant, household, or second account table.

Stack to follow: Next.js App Router, NextAuth, JWT sessions, Prisma, Tailwind, server-rendered list pages.

## 1. User management

### Accounts

One `users` table.

- `email` unique
- `password_hash`
- `full_name`
- `role`: `user` or `admin`
- `is_active`
- `must_change_password` (boolean, default false)
- `password_changed_at` (timestamp, set when the password is stored)
- `ui_language`: `en` or `he`, optional, default `en`

A regular user uses the product. An admin uses the product and manages users. Both sign in on the same login page.

Sign-in checks email and password. An inactive user cannot sign in. A wrong password fails the same way as an unknown email. Do not reveal which of the two failed.

### Session

- JWT, not a database session.
- Idle lifetime 2 hours (`maxAge`). Active use refreshes about every 30 minutes (`updateAge`).
- Secure cookies in production.
- Custom sign-in page at `/login`.
- The token carries user id, role, and `passwordActionRequired`.

### Creating a user

Only an admin can create a user. Required fields: email, full name, role (`user` or `admin`), initial password.

The password must pass the policy in section 2. Store it with bcrypt cost 12. Set `must_change_password` to true and `password_changed_at` to now, so the first session is sent to change-password.

An admin reset of a password uses the same rule: validate, hash at cost 12, set `must_change_password` true, set `password_changed_at` to now.

### Change password

The signed-in user submits current password, new password, and confirmation.

Reject when:

- any field is empty
- new password and confirmation differ
- new password equals the current password
- the current password does not match the stored hash
- the new password fails the policy

On success, store the new hash, set `must_change_password` to false, and set `password_changed_at` to now. Then call a small session-sync route so the JWT picks up `passwordActionRequired: false` before redirecting back into the app.

The change-password screen lists the password rules before the form. If the session is forced here, the intro says a new password is required before continuing. A voluntary visit says they are setting a new password.

Password fields use a show/hide control. Do not log the plaintext password.

### Middleware

After a valid session, if `passwordActionRequired` is set, allow only `/change-password` and `/api/auth`. Every other path redirects to `/change-password`.

A signed-out visit to a protected page redirects to `/login` with `callbackUrl` set to the original path.

`passwordActionRequired` is true when `must_change_password` is true or the password is expired (section 2). Recompute it on each JWT refresh from the user row.

### Header when signed in

Show "Signed in as {name}". The name follows the hide-info mask in section 3.

Then, in order: language toggle, hide-info toggle, Change password, Sign out. Sign out asks for confirmation. An admin may show a small admin badge next to the name.

When signed out, the header shows a Sign in link to `/login`.

### Google sign-in

Offer Google as a second way to sign in, next to email and password. It uses the same `users` row. It does not create an account by itself.

- Admin creates the user first (email, role, temporary password).
- Google sign-in succeeds only when the Google account email matches an existing active user.
- An unknown Google email is rejected with the same generic failure as a bad password.
- An inactive user is rejected.
- A matching Google sign-in starts a normal session for that user (same id, role, and `passwordActionRequired` rules).

Password expiry and forced password change still apply after Google sign-in, because those flags live on the user row. The user completes change-password with their current password before using the rest of the app. Admin-created users already have a temporary password for that step.

Store only the Google account id needed to recognize the link, on the user row. Do not treat Google as a separate user list.

## 2. Password policy

Use the same rules for admin create, admin reset, and self-service change.

- Length 8 to 128 characters.
- At least one `a–z`, one `A–Z`, and one digit.
- Any other Unicode is allowed.
- Each failure has an English message and a Hebrew message. Show the first error.
- The change-password screen lists the rules in the active language:
  - Between 8 and 128 characters
  - At least one lowercase letter (a–z)
  - At least one uppercase letter (A–Z)
  - At least one digit (0–9)

Expiry:

- Read `PASSWORD_MAX_AGE_MONTHS` from the environment. Default is 6. Accept 1 through 120. Any other value falls back to 6.
- The password is expired when now is after `password_changed_at` plus that many calendar months. If the target month is shorter than the original day, clamp to the last day of that month.
- Expired and `must_change_password` both set `passwordActionRequired` and trigger the middleware redirect in section 1.

## 3. Hebrew / English, and hide personal info

### Language

Supported values are `en` and `he`. Default is `en`. Hebrew sets the page direction to `rtl`.

For a signed-in user, store the choice on `users.ui_language`. Read it on the server with one helper and pass it into the page. If it is empty, use `en`.

The header control is two small buttons, `EN` and `עב`. The active button uses a raised slate background and light text. The inactive button is muted and highlights on hover. Each button submits `ui_language` and refreshes the layout. The choice must survive a reload.

On the login screen, language works before a session exists:

- A cookie remembers the login-page language.
- Choosing EN or HE updates that cookie immediately.
- After the email field contains `@`, look up that user's saved language and apply it, unless the person already picked a language on this visit, or the URL pinned `?lang=`.
- On a successful email/password sign-in, write that login language onto `users.ui_language`.

Write copy as a pair of strings per screen and pick with the active language. Cover the header, login, password errors, empty states, filter labels, column headers, and the add button.

### Hide personal / financial info

Label: "Hide personal/financial info" / "הסתרת מידע אישי/פיננסי". Place it in the header beside the language toggle. Both roles may use it.

- It is a checkbox. Disable it while the save is in flight.
- Store it in a session cookie named `session_obfuscate` with value `1`, path `/`, `SameSite=Lax`. Delete the cookie when turned off.
- Do not store this flag in the database. Refreshing the browser keeps it for the session. A new session starts with data visible.
- Server pages call one helper that reads the cookie.
- Mask at render time only. Personal names, free text, and amounts display as `••••`. Blank values and an em dash stay as they are.
- The signed-in name in the header is masked too.
- A filter that lists people shows the masked label. The option value stays the real id.
- Turning the toggle off and refreshing shows the stored values again. Stored data never changes.

## 4. List tables, filters, sort, and add

Every entity list uses the same page frame.

- Page background is dark slate. The inner panel is full width up to a wide max, rounded, one step lighter than the page, with padding and a thin ring.
- A back link, then the page title, then a one-line description.
- Success and error return on the URL as `created`, `updated`, or `error`. Use a green border for success and a rose border for the error text.

The list block:

- A row with the section title on the left and the controls on the right.
- The add control is a link, styled as the primary button (sky background, dark text, semibold, small rounding). The label is "Add {entity}" in the active language.
- The link keeps the current filter and sort query and adds `modal=new`.
- The add form opens in a modal over the list: dimmed overlay, scrollable panel, a text close link and an ×. Both return to the same list URL without `modal`.
- Zero rows: a bordered box, centered text, "No {entities} yet. Add one using the button above." in the active language.

Filters:

- A fieldset titled "Filters".
- Submit with GET so the query string is the filter state and can be refreshed or shared.
- Hidden inputs repeat `sort`, `dir`, and any flash params so applying a filter keeps them.
- A single-choice filter is a select with an "All" option.
- A multi-choice filter is a checkbox dropdown. The summary shows "Any", the single selected label, or "{count} selected". The panel has Select all, Deselect all, a scrollable checkbox list, and Done.
- Optional quick filters are chips. The selected chip is sky; the others are slate.
- Filter labels follow the active language. Person names in options follow the hide-info mask.

Sort:

- Query params `sort` and `dir` (`asc` or `desc`).
- Accept only an allow-list of column keys. Anything else uses the screen's default order.
- Each sortable header is a link. The same column flips direction. A different column starts at `asc`.
- Show an up or down arrow on the active column only, and set `aria-sort` to `ascending` or `descending`.
- Build the sort URL from the current filters so sorting keeps them.

Table chrome:

- Wrap the table in a horizontal scroller with a rounded border.
- Header row is slightly lighter than the body, with a bottom border.
- Cells use compact horizontal and vertical padding, small text. In English, align text to the left. In Hebrew, follow the page direction.
- Dates in cells use the user's date display format.
- Date fields in add and edit forms use a shared date control that displays in that format and still submits `yyyy-mm-dd`. Do not use `<input type="date">`.

Sensitive columns pass through the mask helper whenever the hide-info cookie is on.
