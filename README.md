# Coil Reconciliation Studio

A shared management pack for coil reconciliation. It combines a coil register and a usage/tonnage log, lets the
team key in the remaining coils or meter movements, recalculates every control, and exports monthly Excel reports.

## One workspace, one link

The data lives in a shared store on the server, not in each person's browser. Everyone who opens the link sees and
edits the same register, usage log and hand-keyed entries; saves are pushed automatically and the page refreshes
itself when someone else changes something. The badge in the top bar shows `Shared · time` when the last change is
saved, `Saving…` during a write and `Not shared` if the connection drops.

Simultaneous edits are protected by a revision check: two people saving at the same instant are merged rather than
one silently overwriting the other. Hand-keyed coils from both sides are kept.

**Reset** restores the September sample register for everyone, so it asks for confirmation first.

## Team passcode

The workspace is opened with one shared team passcode. It is stored as the site secret `TEAM_PASSCODE` (never in the
code) and checked by the Worker; a correct entry sets an HTTP-only, signed cookie for 30 days on that device, so the
team types it once per browser. Eight wrong attempts from one address within 15 minutes are refused.

The data API rejects requests without that cookie, and the app shows the passcode screen when the server says the
session is locked. The built-in September sample register still ships inside the page bundle (it always did), but
imported workbooks, hand-keyed entries and the usage log only exist behind the passcode.

To change the passcode, open **Settings → Team passcode** and enter the current and new code. The new code is stored
as a SHA-256 hash in the database (never in the page), the person changing it stays signed in, and every other device
is asked for the new code on its next visit. The deploy-time `TEAM_PASSCODE` secret remains the fallback until the
first in-app change.

**Settings** also shows the loaded register and usage log, the shared revision and last save, offers **Lock this
device** (clears the 30-day cookie on a shared computer) and the restore-to-sample action.

## Two workbooks, uploaded independently

**Import data** opens two separate slots:

| Slot | What it accepts | Effect |
| --- | --- | --- |
| Reconciliation register | Sheet with `DATE`, `COIL NO`, `COLOUR`/`GAUGE`, `COIL RM`, label/HR weights, `ACTUAL RM`, `REMARKS` | Replaces the coil register for everyone; hand-keyed coils are kept |
| Usage & tonnage log | Sheet with `DATE`, `COIL NUMBER`, `OPERATOR`, `MACHINE`, `ORDER NO`, opening/closing meters | Replaces the usage log; tonnage, operators and machines recalculate |

Either workbook can be loaded, replaced or removed on its own, and everything downstream — dashboard, coil
dashboard, exceptions, data quality, usage, monthly report, Excel — is calculated from the two combined. A usage
sheet sent to the register slot (or the reverse) is rejected with an explanation instead of being misread.

## What it does

- **Executive dashboard** — coil counts, completion, validated variance, open balance, tonnage, daily usage,
  status mix and an auto-written management readout.
- **Coil dashboard** — pick a coil and see its weight bridge, meter bridge, variance, exceptions and how it compares
  with other coils of the same colour code.
- **Reconciliation detail** — searchable, sortable coil-by-coil table with CSV export.
- **Exception register** — every exception ranked HIGH / MEDIUM / LOW with the action needed to clear it.
- **Data quality** — eleven live control checks with counts, rates, owners and actions.
- **Usage & tonnage** — a live calculator that records operator, machine and order number, a usage log of every
  meter movement, colour-code consumption and operator performance.
- **Monthly report** — each month recalculated independently, with Excel downloads per month or for the whole scope.
- **Methodology** — definitions, the calculation chain and the import mapping.

## Entering data by hand

**New entry** opens a panel with three tabs:

- **Coil record** — date, coil number, colour code (plus gauge when entered as a family), coil RM, label and HR
  weights, covers, ring, actual RM and status. Expected RM, actual net weight, variance and tonnage are previewed
  live. Records can be edited or deleted afterwards.
- **Usage & tonnage** — date, operator, coil, colour code, **machine**, **order number**, opening/closing meters or
  running meters, and an optional factor override. Tonnage is shown live and the entry is saved to the usage log.
- **Added by hand** — every hand-keyed record, with edit, delete and clear-all.

Hand-keyed entries are stored apart from imported workbooks, so a new upload never deletes them, and they are marked
“Manual” in the app and the Excel detail sheet.

## Monthly reports and Excel exports

The month selector in the top bar scopes every tab to one month or all months. **Excel** downloads the report for
the current scope; the **Monthly report** tab adds per-month downloads plus two workbook types:

- **Detailed report** — management dashboard, monthly summary, reconciliation detail (weights, expected/actual RM,
  variance, tonnage, exceptions), exception register, data-quality checks, colour-code consumption and the usage log
  with machine and order number.
- **Management pack** — headline control figures, status split, variance distribution, largest variances,
  month-by-month summary and definitions.

## Calculations

| Figure | Formula |
| --- | --- |
| Covers weight | `gross weight (HR) − net weight (HR)` |
| Actual net weight | `gross weight (HR) − covers − coil ring` |
| Expected RM | `actual net ÷ label net × coil RM` (source value kept where supplied) |
| Coil balance | `coil RM − actual RM` |
| RM variance | `actual RM − expected RM` |
| Tonnage (MT) | `running meters × colour-code factor ÷ 1,000` |
| Validated population | status complete, expected RM > 0, actual RM > 0, actual net > 0 |

Total tonnage combines the register (actual RM × factor) with every usage-log movement, so loading the usage
workbook adds the transaction layer without double-counting the register.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # typecheck + production build
npx wrangler dev --port 8788 --local   # worker + local D1 for the shared API
```

The shared API is served by `worker/index.js` at `/api/data` and stores the dataset in D1 (`app_docs`, split into
chunks so large registers stay within row limits). Deploying the site attaches the `DB` binding.

## Project layout

```
worker/index.js             static assets + shared dataset API
src/
  data/register.json        September 2026 register (214 coil records)
  lib/shared.ts             shared-workspace client, revision handling, conflict merge
  lib/reconcile.ts          reconciliation engine, exceptions, KPIs, quality checks, monthly summaries
  lib/manual.ts             hand-entry drafts, validation, live derivation
  lib/export.ts             Excel detail and management workbooks
  lib/import.ts             workbook/CSV detection per slot, column mapping
  lib/factors.ts            colour-code tonnage factors, swatches, operators
  components/               shared UI, charts, coil detail, entry panel, usage calculator, import panel
  views/                    the eight management pack tabs
```

## Note on figures

All totals are recomputed from the loaded data, so counts can differ slightly from a hand-typed summary page in a
source workbook. Where they differ, the loaded register wins.

## Order lookup and tonnage factors

**Usage & tonnage → Order & operator lookup.** One search box covers order number, operator, machine, coil number and
colour code. Results are grouped by order number and operator, so an order shows who produced it, on which machine, over
which dates, with the coil count, running meters and tonnage. Searching an operator instead lists every order they
produced. It reads the usage log (imported usage workbook plus hand-keyed entries).

**Settings → Tonnage factors.** Each colour code's factor (kilograms per running meter) can be edited and saved for the
whole team; the value is stored with the shared dataset, so everyone recalculates from it. Codes found in the data but
missing from the workbook list appear with "no standard" and can be given a factor, which brings their coils into the
tonnage totals. "Use workbook standard" clears every team value. Usage entries keep the factor recorded when they were
logged; coil tonnage and the dashboards recalculate immediately.
