# Resume Instructions

**When the user says "Let's resume" or similar, follow these steps:**

## Step 1: Read Context Files
Read these files in order to understand where we are and how to proceed:

1. **`docs/status/deployment-guide-expansion-tracker.json`**
   - Check `current_item` to see which item we're on
   - Review recent decisions to understand context

2. **`docs/status/deployment-guide-conversation-preferences.md`**
   - Review all preferences and requirements
   - Pay special attention to:
     - Work Execution Mode (Decision Collection vs Implementation)
     - Decision Summaries format and timing
     - Option formatting requirements

## Step 2: Determine Current State
- If `current_item` has a decision recorded: Present the NEXT item
- If `current_item` has NO decision yet: Present that item (waiting for user decision)

## Step 3: Continue Work
- Present the current/next item following the format in preferences
- Provide decision summary after each non-skip decision
- Update tracker JSON after each decision
- Follow all formatting and recommendation guidelines

## Quick Reference
- **Total items:** 108
- **Current mode:** Decision Collection (not implementing yet)
- **Tracker location:** `docs/status/deployment-guide-expansion-tracker.json`
- **Preferences location:** `docs/status/deployment-guide-conversation-preferences.md`
- **Items list:** `docs/status/deployment-guide-expansion-items.md`
