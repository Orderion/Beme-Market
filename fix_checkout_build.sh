#!/bin/bash
# fix_checkout_build.sh — adds missing closing } to Checkout function
# Run from: C:\Users\user\Documents\Beme Project\

ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

FILE="Beme-Frontend/src/pages/Checkout.jsx"
cp "$FILE" "${FILE}.bak2"

# Append the missing closing brace
echo "}" >> "$FILE"

echo "✅ Added missing closing } to Checkout.jsx"
echo "Last 5 lines now:"
tail -5 "$FILE"
