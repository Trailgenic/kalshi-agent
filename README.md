# Kalshi Agent — ARCHIVED

**Status: Archived. Not deployed to live trading. Do not reopen without reading this first.**

This repo contains a Claude-powered Kalshi trading agent (dashboard + API routes for harvesting historical markets, generating detectors, and executing trades within guardrails). It works as infrastructure. It was never turned on for live trading, and it should not be.

## Why this is archived

The decision to shelve this was deliberate, not abandonment. The reasoning, for future reference:

**1. No measured edge exists.** The detectors in `api/detectors.js` are placeholders with hardcoded confidence and win-rate values. They were never validated against a real backtest. There is no out-of-sample testing, no cost model, and no evidence that any rule here produces positive expected value.

**2. Win rate is the wrong objective.** On binary contracts, a high hit rate is trivial to manufacture (buy heavy favorites) and is usually negative-EV once the rare large losses are counted. The only thing that matters is expected value relative to entry price, net of Kalshi fees and bid-ask spread. This agent optimizes for the wrong thing.

**3. The dashboard P&L is simulated, not real.** Session P&L is computed from the invented win-rate assumptions, not from resolved outcomes. A running autonomous version would display climbing green numbers regardless of actual results — a dangerous illusion.

**4. No structural edge to defend.** Edge in prediction markets comes from better information, faster execution, or structural access. A frontier model on a cheap VPS provides none of these. Counterparties can run the same models. The model is the commodity layer, not the edge. (This is the exmxc thesis applied to our own project: AI commoditizes execution; judgment and scarcity hold value.)

## What it would take to revisit

Only reopen this if all three are true, in order:

1. A real backtester exists — pulls resolved markets WITH price history (candlestick endpoint), simulates entry price + fees + spread + hold-to-resolution, and reports EV per trade and the full P&L distribution.
2. Out-of-sample validation passes — rules built on one period, tested on a later untouched period, still positive EV after costs.
3. The first hypothesis for any apparent edge is a bug or lookahead leak, not free money. Kalshi is reasonably efficient; the base-rate expectation is that no edge survives costs.

Until a costs-modeled, out-of-sample backtest shows positive EV, this stays in dry-run / archived.

## Build reference

- `index.html` — dashboard (dry-run capable)
- `api/harvest.js` — pulls historical resolved markets (public endpoint, no auth)
- `api/detectors.js` — Claude generates detectors (UNVALIDATED placeholders)
- `api/trade.js` — execution engine with layered guardrails (NEVER run live without a validated edge)
- `vercel.json` — cron config (disabled by archiving)

Archived May 2026.
