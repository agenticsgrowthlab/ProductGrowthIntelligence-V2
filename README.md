# Product Growth Intelligence (PGOS 2.0)

A multi-tenant-ready product strategy to telemetry **prototype** using fictional company data.

## Running locally
Open `index.html` with a local static web server. `pgos-roadmap.html` provides the fictional per-organization roadmap editor.

## Operating modes
- **Demo Data:** Two synthetic organizations, Meridian Digital and Northstar Health, with independent mock strategic, product, and telemetry datasets. Roadmap drafts use browser localStorage, scoped by synthetic organization ID.
- **Real Data:** Intentionally empty and disconnected. No production credentials or integration endpoints are configured. Never substitute demo data in real mode.

## Production hardening requirements
Before connecting real organizations: implement identity and authentication, tenant memberships and RBAC, database authorization and row-level security, read-only integrations approved by each tenant, secure server-side OAuth secrets, AI data governance, audit logging, and automated cross-tenant isolation tests. This static prototype is **not** secure production multi-tenancy. Do not add company credentials to client-side JavaScript or commit database strings to this public repository.

## Source
Adapted from the PGOS prototype in `agenticsgrowthlab/Inventive-Senior-PM`; development preview kept separate from Nicole's Virtual Office.
