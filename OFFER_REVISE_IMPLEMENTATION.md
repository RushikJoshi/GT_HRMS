# Offer Revise + Time-Based Acceptance – Implementation Summary

## Overview

Offer Letter logic for the **recruitment workflow** (Application + Offer model) has been implemented with versioning, revise, and time-based acceptance.

---

## 1. Offer Versioning

- Each offer creates a new version (V1, V2, V3…).
- Multiple offers per application; only one can be **ACTIVE** (SENT) at a time.
- All offers are stored; previous ones are never deleted.
- Status values: `DRAFT`, `SENT`, `ACCEPTED`, `EXPIRED`, `REVISED`, `REJECTED`, `WITHDRAWN`.

**Schema changes:**
- `version` (Number)
- `revisedFromOfferId` (ObjectId)
- `isActiveVersion` (Boolean)
- `expiryAt` (Date) – HR-set acceptance window
- `sentAt` (Date)
- `acceptedAt`, `acceptedBy`, `acceptedById`
- Removed unique index on `(tenant, applicationId)` to support multiple versions.

---

## 2. HR Custom Acceptance Time Window

- HR sets:
  - **Offer Sent DateTime** (`sentAt`)
  - **Offer Expiry DateTime** (`expiryAt`)
- Both are required when sending an offer.
- Stored as ISO timestamps (date + time).

---

## 3. Candidate Accept Flow

- Candidate can accept only when:
  - Status is `SENT`
  - Current time \< `expiryAt`
- On accept:
  - Status → `ACCEPTED`
  - `acceptedAt`, `acceptedBy` recorded
  - Application offer status updated and candidate stage locked.

---

## 4. Auto-Expiry Logic

- If `current time > expiryAt` and offer is not accepted → status set to `EXPIRED`.
- Expiry checked:
  - In backend APIs before accept
  - On read via `Offer.markExpiredOffers()`
- No cron needed.

---

## 5. Offer Revise Flow

- HR can revise only when latest offer status is **EXPIRED** or **REJECTED**.
- On revise:
  - Previous offer status → `REVISED`
  - New offer created with:
    - Next version number
    - New `sentAt` and `expiryAt`
    - Status `SENT`
- Can be repeated any number of times.

---

## 6. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recruitment/applications/:applicationId/offer` | Create first offer (DRAFT) |
| POST | `/api/recruitment/offers/:offerId/send` | Send offer (body: `{ sentAt, expiryAt }`) |
| POST | `/api/recruitment/offers/:offerId/accept` | Candidate accepts (body: `{ acceptanceNotes? }`) |
| POST | `/api/recruitment/applications/:applicationId/offer/revise` | Revise offer (body: `{ sentAt, expiryAt, ... }`) |
| GET | `/api/recruitment/applications/:applicationId/offer/latest` | Get latest offer (incl. expiry check) |

---

## 7. Migration

If you already have offers with the old unique index on `(tenant, applicationId)`, run:

```bash
node backend/scripts/migrate_offer_versioning.js
```

---

## 8. Notes

- Recruitment workflow uses the **Application** model; the existing **Applicant** + letter flow is separate.
- Frontend integration for recruitment offers (e.g. send modal with sentAt/expiryAt, revise button) is separate from this backend work.
- The existing Applicant-based flow (`/letters/generate-offer`, `/candidate/application/accept-offer`) is unchanged.
