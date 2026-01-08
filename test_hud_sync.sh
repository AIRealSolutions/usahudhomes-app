#!/bin/bash
# Test script for HUD Sync System
# Demonstrates the complete workflow

echo "========================================================================"
echo "HUD SYNC SYSTEM - TEST SCRIPT"
echo "========================================================================"
echo ""

# Check if state is provided
STATE=${1:-NC}
echo "Testing with state: $STATE"
echo ""

# Step 1: Test scraping only
echo "========================================================================"
echo "STEP 1: Testing Scraper"
echo "========================================================================"
python3 hud_scraper_browser.py --state $STATE
echo ""

# Find the most recent JSON file
JSON_FILE=$(ls -t hud_properties_${STATE}_*.json 2>/dev/null | head -1)

if [ -z "$JSON_FILE" ]; then
    echo "❌ Error: No JSON file found. Scraping may have failed."
    exit 1
fi

echo "✅ Scraping completed. JSON file: $JSON_FILE"
echo ""

# Step 2: Show JSON preview
echo "========================================================================"
echo "STEP 2: JSON Data Preview"
echo "========================================================================"
echo "First property in JSON:"
python3 -c "import json; data=json.load(open('$JSON_FILE')); print(json.dumps(data[0], indent=2))"
echo ""

# Step 3: Test importer with dry run (if credentials available)
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
    echo "========================================================================"
    echo "STEP 3: Testing Importer (Dry Run)"
    echo "========================================================================"
    python3 hud_importer.py --json $JSON_FILE --state $STATE --dry-run
    echo ""
    
    echo "========================================================================"
    echo "STEP 4: Testing Complete Sync Workflow"
    echo "========================================================================"
    python3 admin_hud_sync.py --state $STATE --dry-run --no-review
else
    echo "========================================================================"
    echo "STEP 3: Database Import Test Skipped"
    echo "========================================================================"
    echo "⚠️  Supabase credentials not set. To test import functionality:"
    echo "   export SUPABASE_URL='your_url'"
    echo "   export SUPABASE_KEY='your_key'"
    echo ""
fi

echo ""
echo "========================================================================"
echo "TEST SUMMARY"
echo "========================================================================"
echo "✅ Scraper: Working"
echo "✅ JSON Output: Generated successfully"
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
    echo "✅ Importer: Tested (dry run)"
else
    echo "⚠️  Importer: Not tested (credentials not set)"
fi
echo ""
echo "Generated files:"
ls -lh hud_properties_${STATE}_*.json 2>/dev/null | tail -3
echo ""
echo "========================================================================"
echo "To run a real import (not dry run):"
echo "  python3 admin_hud_sync.py --state $STATE"
echo "========================================================================"
