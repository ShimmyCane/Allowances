# Action Plan: Retire the Allowances Project

**Repo:** `Allowances` (source, to be archived)
**Source Supabase project:** `kbhlwannygavrnwbebtf`
**Destination:** `twvqvutrcobedvuhnzxq` (Family-Habits project)
**Companion plan:** `../Family-Habits/ACTION_PLAN.md`

Status: draft. Nothing has been changed in this repo or in either database.

---

## 1. Prerequisites

- [ ] Answer decisions D1–D5 in `../Family-Habits/ACTION_PLAN.md` section 0.
- [ ] Connect the Supabase connector, then re-export the live schema of `kbhlwannygavrnwbebtf`. `supabase/schema.sql` in this repo is out of date (for example it has `display_name` and `is_active` on `children`, but `public/app.js` uses `name`).
- [ ] Back up `kbhlwannygavrnwbebtf` (Dashboard → Database → Backups, or a full dump). Keep it until the archive is final.

## 2. Freeze and copy (you do this manually)

Follow section 3 of the companion plan. In short:

- [ ] Tell both parents the app is read-only from a set time.
- [ ] Remove duplicate `interest` rows per child per month before copying.
- [ ] Copy `children`, then `transactions`, then `withdrawal_requests` into the destination tables, keeping the old `id` as `legacy_id`.
- [ ] Record the interest rate (default 5%, stored in each browser's localStorage).

## 3. Reconcile

- [ ] Record each child's current balance from the app (`child-balance` on the child screen) before the freeze.
- [ ] Run the reconciliation query in `../Family-Habits/supabase/allowances_migration.sql` (section 7).
- [ ] All rows must match before continuing.

## 4. Changes to this repo (`Allowances`)

Make these only after reconciliation passes. Until then, keep the app live as the fallback.

| File | Line(s) | Change |
|------|---------|--------|
| `public/app.js` | 2–3 | Point to the destination project URL and publishable key (or remove the app if it's retired). |
| `public/app.js` | 62 | `parents` lookup. Not needed if the habits project has no `parents`. Remove. |
| `public/app.js` | 73 | `children` → `allowance_children`. Select `name`. |
| `public/app.js` | 101–123 | `ensureInterest`. Writes `family_id` and `created_by`. Remove those fields, and decide whether interest runs in the database instead (a scheduled function) so it can't duplicate across browsers. |
| `public/app.js` | 104, 122, 148, 166, 223 | `transactions` → `allowance_transactions`. Remove `family_id` and `created_by` from inserts. |
| `public/app.js` | 168 | `withdrawal_requests` → `allowance_withdrawal_requests`. |
| `public/app.js` | 152, 174 | Balance calc in JS. Replace with a read from `allowance_balances`, or keep as-is if the app stays. |
| `public/index.html` | — | Update any text that references the old project or schema. |
| `supabase/schema.sql` | all | Either update to the live schema, or add a header saying it is historical and point to the destination. |
| `plan.md` | 3 | Add an archive status note. Keep the original design. |
| `.github/workflows/pages.yaml` | 4–6 | Disable the deploy trigger (or delete the workflow) once retired. |
| `Archive/` | — | Keep. Move `convo v0.1.md` as is. |

## 5. Verify

- [ ] Sign in with each parent account and check balances match the reconciliation.
- [ ] Record one test deposit and approve one test withdrawal in the destination, then delete the test rows.
- [ ] Confirm no writes reach `kbhlwannygavrnwbebtf` after cutover (check its table row counts before and after).

## 6. Archive

- [ ] Keep the final backup of `kbhlwannygavrnwbebtf`.
- [ ] Pause the project, or delete it once the backup is confirmed restorable.
- [ ] Set the GitHub Pages deploy to off, or leave a README note in `public/` pointing to the Family-Habits app.
- [ ] Commit the repo changes in section 4.

## 7. Notes

- The publishable key in `public/app.js` is visible to anyone. This is fine only with RLS enabled on the source project. After the move, the source project should not be used again.
- ShimmyAI has an older copy of this plan (`04 AI/Allowances/allowances_ai_brief.md`). Treat this file as current.
