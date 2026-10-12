# mis-suppliers-portal

> suppliers bounded context: web UI (remote)

Part of the **Medicine Inventory System** distributed system — team `medicine-inventory-system`, Grupo 1.
Governance and documentation live in [`mis-docs`](https://github.com/code-corhuila/mis-docs).

## React suppliers increment

Node 24+: `npm ci --ignore-scripts`, `npm test`, `npm run build`.
React 19.3.0 and Lucide are bundled locally with esbuild-wasm; no CDN or secrets
are embedded. mis-front mounts the generated `dist/portal.js` through the shared
gateway capability. Set SUPPLIERS_PORTAL_ROOT in the shell for another checkout.
List, pagination, snapshot detail and ADMIN registration are implemented.
An uncertain registration locks its original body/key for explicit retry, including
view changes in the same login session. Logout/reload discards this memory; no
cross-session recovery is claimed. Backend permissions and document uniqueness
remain authoritative. Shadow DOM isolates styles, not untrusted JavaScript.
CI tests the model and builds the bundle; real browser checks are operator-run.
See [acceptance evidence](docs/WEB-001-suppliers-acceptance.md).
Receipts, supplier maintenance, production deployment and WEB-001 closure remain pending.

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `mis-docs`.
