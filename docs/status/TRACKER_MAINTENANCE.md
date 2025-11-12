# Deployment Guide Tracker Maintenance

## Architectural Changes Array

### Current Approach (Manual)

The `architectural_changes` array at the bottom of `deployment-guide-expansion-tracker.json` is currently maintained manually. This can lead to inconsistencies, especially after operations like deduplication or item reorganization.

### Recommended Approach (Auto-Generated)

The `architectural_changes` array should be automatically derived from items with `"architectural_change": true`. This ensures consistency and prevents reference errors.

**Items with architectural changes:**
- Scan all items for `"architectural_change": true`
- Extract the item number and description from the `note` field
- Build the array dynamically

### Manual Verification Steps

When making large changes to the tracker (deduplication, reorganization, etc.):

1. **Scan for architectural change items:**
   ```bash
   grep -B 20 '"architectural_change": true' docs/status/deployment-guide-expansion-tracker.json
   ```

2. **Verify architectural_changes array references:**
   - Check that each item number in `architectural_changes` array exists
   - Check that each referenced item has `"architectural_change": true`
   - Check that each item with `"architectural_change": true` is listed in the array

3. **Update references after item renumbering:**
   - If items are renumbered or merged, update `architectural_changes` array accordingly
   - Search for the item numbers in parentheses: `(item XX)`

### Validation Script

A simple validation script could check:
- All items in `architectural_changes` array exist and have decisions
- All items with `architectural_change: true` are represented in `architectural_changes`
- No duplicate references in `architectural_changes`

## Prevention Checklist

After any major tracker operation (deduplication, merging, renumbering):

- [ ] Scan all items with `architectural_change: true`
- [ ] Verify each is correctly referenced in `architectural_changes` array
- [ ] Update item numbers in `architectural_changes` if items were renumbered
- [ ] Verify no references to empty/pending items
- [ ] Run validation if script exists

## Current Architectural Changes

As of tracker v4.0, there is ONE architectural change in Item 12:

- **Item 12**: Custom Composite GitHub Actions for multi-repo setup (also mentioned as multi-repo architecture decision)

Note: The `architectural_changes` array currently has two entries, both referencing item 12, which may be redundant but is technically correct since item 12 encompasses both the multi-repo architecture and the custom actions needed to support it.
