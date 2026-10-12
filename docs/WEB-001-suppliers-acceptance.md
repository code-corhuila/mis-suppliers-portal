# WEB-001 suppliers acceptance

Operator-run 2026-10-12, America/Bogota, through mis-front localhost:5173 and the
existing dev gateway/Security/Suppliers. Backend containers/config were not changed.
Playwright/Edge desktop 1366x900 and mobile 390x844 tested ADMIN create (201),
then a deliberately substituted 503 after the real backend had committed.
After switching to account and back, the retry used identical body/key and
returned 200 with the same UUID. One matching row appeared in the loaded page.
Synthetic suppliers created by these tests remain in dev; no real supplier data
or destructive database cleanup was used. A test interceptor was corrected before
the final successful runs to exclude the later forbidden-role request.

CONSULTATION could read and had no register button; a direct real API POST with
that role returned 403. Catalog/React navigation, remount, details and logout passed.
Separate real pagination checks and browser-mocked empty/503 listing states with
real retry passed at widths 1366, 390 and 320. Screenshots were inspected; there
were no page errors or document overflow. Tables scroll within their own container.

Reproduce with npm ci/test/build in this repo and npm start in the paired shell;
use configured synthetic dev accounts. Never publish env, credentials or tokens.
Six unit tests cover body normalization, read/retry, lost acknowledgement with
remount, duplicate click suppression, uncertain-body protection and disposal.
CI executes unit tests and build, not the real browser/DB scenario. No process
restart/logout recovery of the frontend key, full role matrix, receipts, QA or
complete WEB-001 acceptance is claimed.
