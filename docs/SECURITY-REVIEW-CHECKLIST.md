# Marketplace security review checklist

## Purpose

A forward-looking review checklist for the maintainers of Antseed Markets and its supporting backend. This document is **not an audit, vulnerability disclosure, assertion of an incident, or statement that any particular control is absent**. Detailed investigation notes, sensitive test cases and any unresolved findings should be exchanged privately with the maintainer, not posted in public issues or this document.

Review the exact deployed frontend, backend, contract configuration and infrastructure. A passing build or successful wallet connection is not evidence that every transaction path is safe.

## How to respond

For each numbered section, record:

- **Status:** verified / needs investigation / remediation planned / not applicable.
- **Evidence:** applicable commit, file/function references, configuration and test results.
- **Next step:** responsible maintainer and acceptance criteria, where necessary.

Keep sensitive findings and reproduction details in a private channel. Use isolated fixtures or a local chain fork for security testing; do not submit disruptive requests or financial transactions to production as part of this checklist.

## 1. Deployment and trust boundaries

- Which frontend and backend commits are deployed?
- Which chain, token, NFT, Seaport, conduit, reward and registry contracts are supported?
- Which data sources are authoritative for ownership, order validity, trade history and rewards?
- Which values can administrators change, and how are changes communicated or monitored?
- Is the development/staging environment clearly distinguished from production and mainnet?

## 2. Order validation

- Are complete orders validated before publication, storage or execution?
- Are signatures checked against the correct domain, chain, deployment and complete signed fields?
- Are applicable contract-wallet signatures and on-chain validation paths supported correctly?
- Are NFT identity, item types, quantities, currencies, decimal units, amounts, recipients and fees restricted to the supported product model?
- Are all offered and requested items inspected, including extra items and changing-price orders?
- Are order types, conduits, zones, time bounds and counters checked?
- Are submissions schema-validated and unauthorised replacement of existing records prevented?

## 3. Order lifecycle

- Are pending, active, expired, filled, cancelled, locally hidden and unverified states distinguished?
- Are Seaport order status and the offerer's current counter interpreted correctly?
- Are untouched and partially filled orders handled according to the supported order model?
- Does the user-facing cancellation flow accurately describe and perform the intended revocation?
- Are cached and cross-posted copies accounted for when communicating cancellation status?
- Are lifecycle updates idempotent, with confirmation and reorganisation handling?

## 4. Transaction intent and wallet permissions

- Does the transaction presented for signing match the position and complete payment terms the user reviewed?
- Are unexpected assets, recipients, approvals or fees rejected before requesting a wallet action?
- Are ownership, balances, allowances and order eligibility checked at the appropriate stages?
- Is execution simulated where appropriate, with remaining race conditions understood?
- Are token allowances and NFT operator approvals appropriately scoped and clearly explained?
- Can users distinguish connection, approval, signed orders and asset-transfer transactions?
- Are rejected signatures, wrong networks, pending submissions and uncertain confirmations handled accurately?
- Do busy states prevent accidental duplicate actions without falsely reporting an unconfirmed transaction as failed?

## 5. Backend authorisation and market records

- What evidence authorises each state-changing endpoint?
- Are user notifications treated as hints until relevant on-chain outcomes are verified?
- Are receipts and events checked against the expected chain, contracts, order identities and participants?
- Are signed application actions bound to their intended domain, action, target, expiry and replay protection?
- Are related database changes atomic and repeat notifications safe?
- Can unverified information be clearly labelled without becoming an authoritative ownership or financial record?

## 6. Indexing and data integrity

- What happens when an indexer or RPC is unavailable, delayed, inconsistent or reorganised?
- Is freshness or unavailability visible instead of silently substituting untrusted assertions?
- Are trades deduplicated using appropriate chain and event identities?
- Are current ownership and position lifecycle changes reconciled with authoritative data?
- Are financial aggregates based only on appropriately verified inputs?
- Can stored historical records be reconciled without silently inventing or losing activity?

## 7. Position economics and reward rights

- Does the interface accurately distinguish principal, weighting, lock mode, effective epochs and pending changes?
- Are displayed maturity and early-exit estimates based on the applicable current contract state?
- Which position properties may change between listing, review and settlement?
- What protections or disclosures apply to those changes, and which are enforced atomically on-chain?
- Are split, merge, move, extension and withdrawal eligibility rules represented accurately?
- Are accrued reward rights traced across transfers, restructuring, closure and escrow ownership?
- Can users discover historical claims after an NFT is no longer in their active holdings?
- Are configurable penalties and reward settings read rather than assumed immutable?

## 8. Currency and numeric consistency

- Do the frontend, backend, indexer and stored orders agree on supported currencies?
- Are token identity and decimal precision validated rather than inferred from display labels?
- Are signed amounts, displayed totals, unit prices, fees and historical records consistent?
- Is fixed-point/integer arithmetic used appropriately for transaction-critical amounts?
- Are older order formats handled explicitly rather than silently reinterpreted?

## 9. Infrastructure and dependencies

- Are request validation, size limits, rate limits and resource bounds appropriate for public endpoints?
- Are administrative routes protected in the actual reverse-proxy and network configuration?
- Are secrets excluded from browser bundles, responses, logs and repositories?
- Are deployment access, dependency integrity, monitoring and rollback procedures documented?
- Have current dependency findings been assessed for applicability to deployed code?
- Are updates to wallet and settlement dependencies tested before release?

## 10. Release evidence

- Are positive and negative tests available for supported order and management flows?
- Do local/fork tests cover lifecycle transitions, replay resistance, changed position state and infrastructure failures?
- Have representative wallet implementations and mobile layouts been checked?
- Are live-data smoke tests clearly distinguished from signed-transaction tests and fixture tests?
- Are any audit scope, remaining uncertainties and accepted risks documented accurately?
- Has the maintainer reviewed unresolved findings privately before production sign-off or expansion into lending/vault products?

## Suggested response table

| Section | Status | Evidence / test reference | Owner / next step |
| --- | --- | --- | --- |
| 1. Deployment and boundaries | | | |
| 2. Order validation | | | |
| 3. Order lifecycle | | | |
| 4. Intent and permissions | | | |
| 5. Backend authorisation | | | |
| 6. Data integrity | | | |
| 7. Position economics | | | |
| 8. Currency consistency | | | |
| 9. Infrastructure | | | |
| 10. Release evidence | | | |

Completion should identify what was actually verified. It should not substitute a checklist tick for code review, transaction tests or an independent security assessment where appropriate.
