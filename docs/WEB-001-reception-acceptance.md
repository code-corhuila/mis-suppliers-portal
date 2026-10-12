# WEB-001 reception acceptance

Operator-run 2026-10-12, America/Bogota, with the paired mis-front reception scope.
Workflow's expired dev service JWT was renewed through the existing Security CLI,
preserving subject/public key; no private key or token was exposed to the browser.

Playwright/Edge: ADMIN at 1366x900 and INVENTORY at 390x844 selected active supplier
and medication through paginated real APIs, then submitted one synthetic lot with
quantity 7 and future expiry. The real Workflow returned 201 COMPLETED/four steps.
The test replaced that committed response with 503. After account/view remount,
the UI replayed the identical body/key and received 200 with the same saga ID.
Owner API reads verified receipt CONFIRMED, entry ACTIVE, available stock 7,
pending stock 0 and exactly one movement for that new lot. The Inventory screen
then found the same lot. Two synthetic receptions remain in dev; no data cleanup
or direct database modification was performed.

SUPERVISOR looked up the real saga by ID without a create control. Screenshots were
inspected without JavaScript errors or horizontal document overflow. This proves
committed-response loss/replay, not a real RUNNING-step failure or compensation.
RUNNING requires explicit resume; FAILED remains for administrative review and
cannot be discarded to silently start a replacement. Compensation has no UI here.

Five new unit cases cover validation/Bogota dates, replay/remount, explicit resume,
unknown-intent protection, failed-state retention and date-rollover replay.
CI runs unit tests/build, not live multi-service acceptance. Session/body/key memory
is lost on logout/reload; known saga IDs can be queried under backend permissions.
One medication/lot per reception follows the current Workflow contract. Production,
full role matrix, failure/compensation UI, QA and WEB-001 closure remain pending.
