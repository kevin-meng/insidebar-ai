# Provider SDK + Multi-AI Broadcast · Development Record

**Date:** 2026-09-25  
**Branch:** `feat/provider-sdk-broadcast`  
**Pull request:** #1  
**Status:** automated validation complete (15 test files / 202 tests); browser E2E pending

This directory is the durable engineering record for the Provider SDK / Multi-AI Broadcast stage.

## Document map

1. [01_REQUIREMENTS_AND_BASELINE.md](./01_REQUIREMENTS_AND_BASELINE.md)  
   Why this stage exists, what the original architecture looked like, and which coupling points had to be removed.

2. [02_ARCHITECTURE_DECISIONS.md](./02_ARCHITECTURE_DECISIONS.md)  
   The major design decisions, alternatives considered, trade-offs, and reasons behind the chosen architecture.

3. [03_IMPLEMENTATION_PHASES.md](./03_IMPLEMENTATION_PHASES.md)  
   Phase-by-phase implementation record with concrete files and behavior changes.

4. [04_VALIDATION_AND_RISK.md](./04_VALIDATION_AND_RISK.md)  
   What can be verified automatically, what has been verified, what remains browser-dependent, and known risks.

5. [05_MANUAL_E2E_CHECKLIST.md](./05_MANUAL_E2E_CHECKLIST.md)  
   Minimal manual Chrome/Edge acceptance checklist for the final third-party web-app validation.

6. [06_FOLLOW_UP_BACKLOG.md](./06_FOLLOW_UP_BACKLOG.md)  
   Security hardening, dependency refresh, provider diagnostics and later product stages.

## Related permanent documentation

- [Provider Adapter Architecture](../../PROVIDER_ADAPTERS.md)
- [Multi-AI Workspace Roadmap](../../MULTI_AI_ROADMAP.md)

## Documentation rule for future stages

Every material provider/platform stage should leave:

- the problem and target state;
- architecture/design decisions and rejected alternatives;
- implementation phases;
- automated validation evidence;
- unresolved risks / technical debt;
- manual verification that cannot be automated;
- next-step entry criteria.

The goal is that a future maintainer can answer both **“what does the code do?”** and **“why was it designed this way?”** without relying on chat history.
