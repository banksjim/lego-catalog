# Deployment Guide Expansion - Conversation Preferences

**IMPORTANT: Read this file when resuming this conversation after context window changes.**

## User Context
- **Solo developer** building Lego Catalog application
- **Target scale:** Max 1000 users over next 12 months
- **Current scale:** ~100 users
- **Cost-conscious:** Prefer simple, affordable solutions over enterprise complexity

## Architectural Decisions Made
- **Multi-repo architecture:**
  - `GCP-cloud-run-sql-environments` - Infrastructure repo (all Terraform for dev + prod)
  - `lego-catalog` - Application repo (backend/frontend code)
  - Infrastructure repo designed to host multiple applications (not Lego-specific)
- **Two environments:** Dev + Prod (not three)
- **Observability:** Honeycomb (not Datadog - cost reasons)
- **Custom GitHub Actions:** Learning opportunity, needed for multi-repo coordination

## How to Present Items

### Option Formatting
**REQUIRED:** Each option on a separate line (no blank lines between them):
```
**A.** Add (full) - Description
**B.** Add (brief) - Description **(RECOMMENDED)**
**C.** Separate - Description
**D.** Skip - Description
**E.** Discuss - Description
```

**CRITICAL:** Mark your recommended option with asterisk: `**(RECOMMENDED)**`

**NOT THIS:** Options all on one line running together

### Include Alternative Recommendations
When you have a recommendation that differs from full implementation, CREATE AN ADDITIONAL OPTION for it.

Example:
- **A.** Add (full) - Complete 3-page guide
- **B.** Add (brief) - Just essential paragraph ← YOUR RECOMMENDED ALTERNATIVE
- **C.** Skip

Don't make the user say "Add but with your alternative" - make the alternative a selectable option.

### Provide Recommendations
For each item, give YOUR RECOMMENDATION based on:
- Solo developer context (no team)
- 1000 user scale (not enterprise)
- Cost considerations
- Learning vs production tradeoffs

Include pros/cons when helpful for decision-making.

### Number of Options
You can provide MORE than A-D options. Use A-F or more if you have multiple valid alternatives.

## Work Summaries

### When to Summarize
**AFTER completing work on any non-skip item, BEFORE presenting the next item.**

If user selects "Skip", no summary needed - just move to next item.

### Summary Format
- **Length:** 100-120 words maximum, shorter if sufficient
- **Content:** What you added/created, where it goes, key topics covered
- **Timing:** Immediately before presenting the next item

Example:
```
**Work Summary for Item 11:**
Adding section on secrets management to CI/CD chapter. Covers GitHub Secrets
setup, GCP Secret Manager integration, least privilege patterns (separate
service accounts per environment), and quarterly manual rotation for solo
developer. Includes workflow example showing access to both GitHub and GCP
secrets. Estimated 1-1.5 pages in main guide.

---

**Progress: Item 12 of 108**
[Next item presentation...]
```

## Important Files

**Location:** All tracking files are in `docs/status/`
- `docs/status/deployment-guide-expansion-tracker.json` - Tracks decisions, current position
- `docs/status/deployment-guide-expansion-items.md` - Full list of 108 items
- `docs/status/deployment-guide-conversation-preferences.md` - THIS FILE

**Documentation Structure:**
- `CLOUD_DEPLOYMENT_GUIDE.md` - Main guide (at repo root)
- `docs/README.md` - Documentation hub with links to all guides
- `docs/enhancements/cloud-deployment-guide/detailed-guidance/` - All detailed sub-documents
  - Terraform modules, state management, network architecture
  - GitHub Actions workflows
  - Deployment strategies
  - CI/CD guides
  - All future separate documents go here

## Progress Tracking
Current item number is stored in tracker JSON. Always update after each decision.

## Work Execution
User expects work to be done, not just tracked for later. When items are selected (Add/Separate), create the actual content.

## Linking Requirements
**CRITICAL:** ALL separate documents MUST be referenced and linked in the main `CLOUD_DEPLOYMENT_GUIDE.md` in appropriate context.

- When creating a separate document, add a link to it in the relevant section of the main guide
- Link format: `**📘 [Topic Name](docs/enhancements/cloud-deployment-guide/detailed-guidance/filename.md)**`
- Provide brief context about what the linked document covers
- Also update `docs/README.md` with the new document under the appropriate category
