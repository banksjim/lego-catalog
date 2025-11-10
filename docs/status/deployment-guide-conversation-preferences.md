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
**CRITICAL FORMAT REQUIREMENT:**

After presenting the context and recommendation, add a blank line, then:

```
Here are your options:

- **A. Add (full)** - Description

- **B. Add (brief)** - Description **(RECOMMENDED)**

- **C. Separate** - Description

- **D. Skip** - Description

- **E. Discuss** - Description
```

**REQUIRED:**
- Blank line before "Here are your options:"
- Blank line AFTER "Here are your options:" before option A
- Use bullet list format with `- **A.**` for each option
- BLANK LINE between EACH option (this is critical for readability!)
- Mark recommended option with `**(RECOMMENDED)**`
- Bold the option letter and label (e.g., **A. Add (full)**)

**NOT THIS:** Options crammed together without blank lines

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

## Decision Summaries

### When to Summarize
**AFTER recording any non-skip decision, BEFORE presenting the next item.**

If user selects "Skip", no summary needed - just move to next item.

### Summary Format (Decision Collection Mode)
- **Length:** 50-80 words maximum
- **Content:** What decision was made, what will be created/added when implemented
- **Timing:** Immediately before presenting the next item

Example:
```
**Decision Summary for Item 34:**
Recorded decision: Separate document for secret rotation procedures (manual only).
Will create detailed guide covering database password rotation, API key rotation,
JWT signing key rotation, and service account rotation. Focus on quarterly manual
procedures for solo developer with step-by-step gcloud commands.

---

**Progress: Item 35 of 108**
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

## Work Execution Mode

**CURRENT MODE: Decision Collection (Items 1-108)**
- Collect user decisions for all 108 items
- Record decisions and notes in tracker JSON
- Do NOT implement the actual documentation yet
- After all decisions collected, implement in batches

**When we switch to Implementation Mode:**
- User will explicitly request implementation
- Create actual content based on collected decisions
- Work through items systematically

## Linking Requirements
**CRITICAL:** ALL separate documents MUST be referenced and linked in the main `CLOUD_DEPLOYMENT_GUIDE.md` in appropriate context.

- When creating a separate document, add a link to it in the relevant section of the main guide
- Link format: `**📘 [Topic Name](docs/enhancements/cloud-deployment-guide/detailed-guidance/filename.md)**`
- Provide brief context about what the linked document covers
- Also update `docs/README.md` with the new document under the appropriate category
