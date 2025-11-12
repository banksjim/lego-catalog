#!/bin/bash
# Validation script for deployment-guide-expansion-tracker.json
# Checks for consistency in architectural_changes array

set -e

TRACKER_FILE="docs/status/deployment-guide-expansion-tracker.json"

echo "🔍 Validating deployment guide tracker..."
echo ""

# Check if tracker file exists
if [ ! -f "$TRACKER_FILE" ]; then
    echo "❌ ERROR: Tracker file not found at $TRACKER_FILE"
    exit 1
fi

echo "✅ Tracker file exists"
echo ""

# Extract items with architectural_change: true
echo "📋 Scanning for items with architectural_change: true..."
# Find all lines with architectural_change, then look backwards for the item number
ARCH_ITEMS=$(awk '/"architectural_change": true/ {
    # Search backwards through previous lines to find the item number
    for (i = NR-1; i >= NR-15 && i >= 1; i--) {
        if (lines[i] ~ /"[0-9]+": \{/) {
            match(lines[i], /"([0-9]+)": \{/, arr)
            print arr[1]
            break
        }
    }
}
{lines[NR] = $0}' "$TRACKER_FILE" | sort -n || true)

if [ -z "$ARCH_ITEMS" ]; then
    echo "   No items found with architectural_change: true"
else
    echo "   Found items with architectural_change: true:"
    for item in $ARCH_ITEMS; do
        echo "   - Item $item"
    done
fi
echo ""

# Extract item references from architectural_changes array
echo "📋 Scanning architectural_changes array for item references..."
ARRAY_REFS=$(grep -oP '\(item \K\d+(?=\))' "$TRACKER_FILE" | sort -n || true)

if [ -z "$ARRAY_REFS" ]; then
    echo "   No item references found in architectural_changes array"
else
    echo "   Found references in architectural_changes array:"
    for ref in $ARRAY_REFS; do
        echo "   - Item $ref"
    done
fi
echo ""

# Check for mismatches
echo "🔍 Checking for inconsistencies..."
ISSUES_FOUND=0

# Check if all array references point to items with architectural_change: true
for ref in $ARRAY_REFS; do
    if ! echo "$ARCH_ITEMS" | grep -qw "$ref"; then
        echo "   ⚠️  Item $ref is referenced in architectural_changes but doesn't have architectural_change: true"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

# Check if all items with architectural_change: true are in the array
for item in $ARCH_ITEMS; do
    if ! echo "$ARRAY_REFS" | grep -qw "$item"; then
        echo "   ⚠️  Item $item has architectural_change: true but is not referenced in architectural_changes array"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

# Check if referenced items exist and have decisions
for ref in $ARRAY_REFS; do
    # Check if the item exists
    if ! grep -q "\"$ref\": {" "$TRACKER_FILE"; then
        echo "   ❌ Item $ref referenced in architectural_changes does not exist in tracker"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        # Check if the item has a decision
        ITEM_SECTION=$(sed -n "/\"$ref\": {/,/},/p" "$TRACKER_FILE")
        if echo "$ITEM_SECTION" | grep -q '"decision": null'; then
            echo "   ❌ Item $ref referenced in architectural_changes has no decision (null)"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    fi
done

echo ""

# Summary
if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ All validation checks passed! No inconsistencies found."
    exit 0
else
    echo "❌ Validation failed with $ISSUES_FOUND issue(s) found."
    echo ""
    echo "Run this script after any major tracker operations (deduplication, merging, etc.)"
    echo "to ensure architectural_changes array consistency."
    exit 1
fi
