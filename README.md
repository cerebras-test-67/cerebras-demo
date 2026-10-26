# Fieldstone Dispatch

Scheduling and dispatch for HVAC, plumbing and electrical contractors. Dispatchers plan the day on a board, the optimizer builds routes, and technicians run their jobs from the mobile app, online or off.

## What's in here

- `src/optimizer/`: builds each technician's route for the day from jobs, skills, service areas and time windows
- `src/sync/`: the mobile offline queue. Edits made without signal (notes, photos, status) are stored on the device and synced when the connection comes back
- `src/export/`: CSV exports of jobs, invoices and timesheets
- `src/auth/`: sessions and sign-in (password and magic link today, SAML SSO in progress)

## Running it

```
npm install
npm run dev     # API on :4000 with a seeded demo company
npm test
```

## Releases

We ship the mobile app and API together on a weekly train.

- 2.5.4: offline notes fix for iOS
- 2.6: route optimization (break-aware routes, map pin clustering), staged rollout behind a feature flag

## Owners

- Engineering: Marcus Chen
- Design: Lena Brooks
- Support escalations: Jen Okafor
