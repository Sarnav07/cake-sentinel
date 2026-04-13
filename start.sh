#!/usr/bin/env bash
set -euo pipefail

npx concurrently \
  "npm run start --workspace=@pancakeswap-agent/market-intelligence" \
  "npm run start --workspace=@pancakeswap-agent/strategy" \
  "npm run dev --workspace=@pancakeswap-agent/risk" \
  "npm run dev --workspace=@pancakeswap-agent/portfolio" \
  "npm run dev --workspace=@pancakeswap-agent/dashboard"