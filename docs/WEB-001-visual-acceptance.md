# WEB-001 - Suppliers visual acceptance

Operator-run Edge acceptance, 2026-10-12; partial visual alignment, not HU closure.
The existing Lucide controls remain; headings/fields/primary commands/status labels
now align with the shell. Tables have their own scroll boundary; mobile forms stack.

- All 11 existing registration/reception model tests passed; npm run build succeeded.
  CI model tests do not replace browser/backend acceptance.
- Real login/list reads, supplier details, registration form entry/cancel and
  reception selector rendering passed at 1366, 801, 800, 390 and 320 px.
- Mobile CONSULTATION had neither registration nor reception command.
- Non-table controls fit their host; no document horizontal overflow/page exceptions.
  Desktop/mobile screenshots were inspected, including the reception form.
- No supplier or saga write was submitted; these checks do not claim a new real
  reception transaction or compensation test. Existing native acceptance is separate.

The browser driver/screenshots remain local-only. Non-local host injection was
blocked in the test browser without changing system antivirus settings. Models,
API paths, pending keys, credentials and dependency versions are unchanged.
Real summary/alert screens, production packaging and integrated QA remain pending.
