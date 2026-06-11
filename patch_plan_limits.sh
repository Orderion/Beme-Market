#!/bin/bash
ROOT="/c/Users/user/Documents/Beme Project"
cd "$ROOT"

node << 'NODEEOF'
const fs = require("fs");
let src = fs.readFileSync("Beme-Frontend/src/hooks/useSellerAuth.js","utf8").replace(/\r\n/g,"\n");

// Update product limits and AI access per plan
const OLD = `    basic:    { maxProducts: 5,   hasSocialLinks: false, hasChat: false, hasAI: false, hasBoosts: false, boostsPerMonth: 0  },
    starter:  { maxProducts: 10,  hasSocialLinks: true,  hasChat: true,  hasAI: false, hasBoosts: false, boostsPerMonth: 0  },
    growth:   { maxProducts: 25,  hasSocialLinks: true,  hasChat: true,  hasAI: false, hasBoosts: true,  boostsPerMonth: 5  },
    standard: { maxProducts: 25,  hasSocialLinks: true,  hasChat: true,  hasAI: false, hasBoosts: true,  boostsPerMonth: 5  },
    pro:      { maxProducts: 500, hasSocialLinks: true,  hasChat: true,  hasAI: true,  hasBoosts: true,  boostsPerMonth: 20 },
    free:     { maxProducts: 5,   hasSocialLinks: false, hasChat: false, hasAI: false, hasBoosts: false, boostsPerMonth: 0  },`;

const NEW = `    basic:    { maxProducts: 10,  hasSocialLinks: false, hasChat: false, hasAI: false, aiDailyLimit: 0,    hasBoosts: false, boostsPerMonth: 0  },
    starter:  { maxProducts: 50,  hasSocialLinks: true,  hasChat: true,  hasAI: true,  aiDailyLimit: 50,   hasBoosts: false, boostsPerMonth: 0  },
    growth:   { maxProducts: 150, hasSocialLinks: true,  hasChat: true,  hasAI: true,  aiDailyLimit: 100,  hasBoosts: true,  boostsPerMonth: 5  },
    standard: { maxProducts: 150, hasSocialLinks: true,  hasChat: true,  hasAI: true,  aiDailyLimit: 100,  hasBoosts: true,  boostsPerMonth: 5  },
    pro:      { maxProducts: 500, hasSocialLinks: true,  hasChat: true,  hasAI: true,  aiDailyLimit: 1000, hasBoosts: true,  boostsPerMonth: 20 },
    free:     { maxProducts: 10,  hasSocialLinks: false, hasChat: false, hasAI: false, aiDailyLimit: 0,    hasBoosts: false, boostsPerMonth: 0  },`;

if (src.includes(OLD.trim().slice(0,60))) {
  src = src.replace(OLD, NEW);
  console.log("✅ Plan limits updated");
} else {
  console.log("❌ Pattern not found");
}

fs.writeFileSync("Beme-Frontend/src/hooks/useSellerAuth.js", src.replace(/\n/g,"\r\n"),"utf8");
NODEEOF
