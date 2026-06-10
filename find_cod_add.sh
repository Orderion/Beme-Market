#!/bin/bash
cd "/c/Users/user/Documents/Beme Project"
grep -n "orders.*add\|add(payload)\|orderRef" Beme-Backend/src/routes/orderRoutes.js | head -10
