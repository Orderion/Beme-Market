#!/bin/bash
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HDR="$SCRIPT_DIR/Beme-Frontend/src/components/Header.jsx"
CSS="$SCRIPT_DIR/Beme-Frontend/src/components/Header.css"

echo -e "${YELLOW}Patching Header.jsx...${NC}"
if grep -q "SetIconMessages" "$HDR"; then
  echo -e "  ${GREEN}✓${NC} Header.jsx already has Messages (skipping)"
else
  # Add Messages icon function before SetIconLogout
  awk '
  /function SetIconLogout\(\)/ {
    print "function SetIconMessages() {"
    print "  return ("
    print "    <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"1.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" aria-hidden=\"true\">"
    print "      <path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/>"
    print "    </svg>"
    print "  );"
    print "}"
  }
  { print }
  ' "$HDR" > "$HDR.tmp" && mv "$HDR.tmp" "$HDR" 
  # Add Messages nav item after Orders in dropdown
  awk '
  /settingsNav\("\/orders"\)/ {
    print
    getline; print  # print the <span>Orders line
    getline; print  # print the </button>
    print "        <button className=\"hdr-set-item\" onClick={() => settingsNav(\"/messages\")} type=\"button\">"
    print "          <span className=\"hdr-set-item-icon\"><SetIconMessages /></span>Messages"
    print "        </button>"
    next
  }
  { print }
  ' "$HDR" > "$HDR.tmp" && mv "$HDR.tmp" "$HDR" 
  echo -e "  ${GREEN}✓${NC} Header.jsx patched"
fi

echo -e "${YELLOW}Patching Header.css...${NC}"

  # Remove border-bottom line from .hdr-set-item rule block
  awk '
  /border-bottom: 1px solid var\(--border\);/ {
    # Check if next line is cursor: pointer (inside .hdr-set-item)
    next_line = ""
    if ((getline next_line) > 0) {
      if (next_line ~ /cursor: pointer;/) {
        # Skip the border-bottom line, print cursor line
        print next_line
        next
      } else {
        # Not in .hdr-set-item, print both
        print
        print next_line
        next
      }
    }
  }
  { print }
  ' "$CSS" > "$CSS.tmp" && mv "$CSS.tmp" "$CSS"


  # Remove .hdr-set-item:last-of-type border rule
  sed -i '/\.hdr-set-item:last-of-type { border-bottom: none; }/d' "$CSS"

echo -e "  ${GREEN}✓${NC} Header.css patched"

echo -e "${GREEN}Done! Now run: cd Beme-Frontend && git add . && git commit -m \"Fix header nav\" && git push${NC}"