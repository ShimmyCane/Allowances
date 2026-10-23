# Action Plan: Retire the Allowances Project

**Repo:** `Allowances` (source, to be archived)
**Source Supabase project:** `kbhlwannygavrnwbebtf` ("Allowance")
**Destination:** `twvqvutrcobedvuhnzxq` ("Family", the habits project)
**Companion plan and results:** `../Family-Habits/ACTION_PLAN.md`

## Status (2026-10-23)

| Step | State |
|------|-------|
| Export live schema and data | Done (read-only, nothing in this project was changed) |
| Copy data into the habits project | Done, 13 transactions, reconciled |
| Point the Allowances app at the new tables | Done in draft PR #2 (not merged; real login untested) |
| Archive or pause this Supabase project | **Not started** (yours to do) |

## 1. What the live project contains

- `children`: Athena and Felix (columns `id`, `name`, `created_at`, `family_id`; no `is_active`)
- `transactions`: 13 rows, all deposits. Type check allows only `deposit` and `withdrawal`.
- `withdrawal_requests`: 0 rows
- `families`: 1 row, `parents`: 1 row
- `supabase/schema.sql` in this repo is out of date: it has `display_name`, `is_active` on `children` and allows `interest` and `adjustment`. The live project does not.
- Balances: Athena 6.25 (7 rows), Felix 5.50 (6 rows)

## 2. Where the data went

- Children were not copied. Athena and Felix already exist in `family_members` in the habits project and the ledger links to them by name.
- Transactions went to `allowance_transactions` with the original id kept in `legacy_id`. Dates and notes are identical (checksum verified).
- `family_id`, `created_by`, `families` and `parents` were not copied.

## 3. Before archiving this project

- [ ] Take a backup of `kbhlwannygavrnwbebtf` (Dashboard → Database → Backups) and keep it.
- [ ] Confirm each parent can sign in to the habits project (the Allowances app uses its own login, which is a separate account in this project).
- [ ] Complete section 4 and check the app against the new tables with a real login.

## 4. Changes to this repo (made in PR #2, not merged)

PR #2 (`allowances-use-habits-project`) makes these changes to `public/app.js`; the table below is what it covers. Test with a parent login before merging, because the Pages site deploys from `main`. The habits project has one auth user, so the app signs in with the same email and password as the habits app.

One difference from the table: PR #2 reads kids from `family_members` and keys rows by `member_name` (name), not by an id. It also ignores the duplicate-key error when another device has already paid a month's interest (the database now allows one interest row per kid per month).

| File | Line(s) | Change |
|------|---------|--------|
| `public/app.js` | 2–3 | Use the habits project URL and publishable key. |
| `public/app.js` | 62 | Remove the `parents` lookup (no `parents` table or `family_id` in the new project). |
| `public/app.js` | 73 | `children` → `family_members`, filter `role = 'kid'`, order by `display_order`. |
| `public/app.js` | 104, 148, 166, 223 | `transactions` → `allowance_transactions`. Use `member_name` instead of `child_id`. Drop `family_id` and `created_by`. |
| `public/app.js` | 168 | `withdrawal_requests` → `allowance_withdrawal_requests`. |
| `public/app.js` | 101–123 | `ensureInterest`: remove `family_id` and `created_by`. The old type check blocked interest rows; the new table allows `interest`. |
| `public/app.js` | 152, 174 | Keep the JS balance sum, or read `allowance_balances`. Withdrawal approvals should call `approve_allowance_withdrawal`. |
| `supabase/schema.sql` | all | Add a header marking it historical and pointing to `../Family-Habits/supabase/allowances_migration.sql`. |
| `.github/workflows/pages.yaml` | — | Leave as is while the app is live. Disable when retired. |
| `plan.md`, `Archive/` | — | Keep. Add an archive note at the end. |

## 5. Archive

- [ ] Keep the final backup of `kbhlwannygavrnwbebtf`.
- [ ] Pause the project, or delete it once the backup is confirmed restorable.
- [ ] Disable the Pages deploy, or leave a notice pointing to the new app.

## 6. Notes

- The old project has the publishable key in `public/app.js`. It is safe only with RLS on; the project is read-only as far as this work is concerned.
- ShimmyAI has an older copy of the design (`04 AI/Allowances/allowances_ai_brief.md`). Treat this file as current.
