# blocklens-mcp-server

MCP (Model Context Protocol) server for [Blocklens](https://blocklens.co) Bitcoin on-chain analytics. Connect your AI agent to **109 on-chain metrics** computed from raw blockchain data — no API wrappers, no delays.

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "blocklens": {
      "command": "npx",
      "args": ["-y", "blocklens-mcp-server"],
      "env": {
        "BLOCKLENS_API_KEY": "blk_your_key_here"
      }
    }
  }
}
```

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Cursor / Windsurf

Add to your MCP config (`.cursor/mcp.json`):

```json
{
  "blocklens": {
    "command": "npx",
    "args": ["-y", "blocklens-mcp-server"],
    "env": {
      "BLOCKLENS_API_KEY": "blk_your_key_here"
    }
  }
}
```

### Demo Mode (No API Key)

Works without an API key — you get 60 days of history for basic-tier metrics. Get an API key at [blocklens.co/api-keys](https://blocklens.co/api-keys) for full access.

## Available Tools (15)

| Tool | Description |
|------|-------------|
| `list_metrics` | List all 109 available metrics with categories and tiers |
| `search_metrics` | Search metrics by keyword |
| `get_metric` | Get full definition of a single metric |
| `get_categories` | List metric categories with counts |
| `get_prices` | BTC daily OHLC, market cap, volume, drawdown, realized volatility (1W–1Y) |
| `get_holder_supply` | LTH/STH supply breakdown, circulating supply |
| `get_holder_valuation` | Realized cap/price, MVRV, thermo cap, delta cap, balanced price, investor cap |
| `get_holder_profit` | NUPL, realized/unrealized P/L, SOPR — LTH/STH breakdowns (Pro tier) |
| `get_cohort_metrics` | Age cohort supply, realized cap, realized price (12 age brackets) |
| `get_utxo_history` | UTXO set breakdown by age cohort |
| `get_coindays` | Coin Days Destroyed, liveliness, vaultedness, dormancy, dormancy flow |
| `get_blockchain` | Block height, blocks mined |
| `get_cycle_performance` | Cycle performance indexed from lows, ATHs, halvings |
| `get_latest_metrics` | Latest snapshot across all categories |
| `render_chart` | Render any metric as PNG with annotations and templates |

## Metrics Coverage (109 total)

### Market Data (27 metrics)
Price, OHLC, volume, market cap, drawdown from ATH, **6 realized volatility windows** (1W, 2W, 1M, 3M, 6M, 1Y), cycle performance, and individual cycle tracks from lows, ATHs, and halvings.

### Supply (16 metrics)
Circulating supply, LTH/STH supply, cost basis distribution heatmap, and **12 age cohort supplies** (<24h through 10y+) for HODL Waves analysis.

### Valuation (41 metrics)
Realized cap, realized price, MVRV (aggregate + LTH/STH), thermo cap, delta cap, average cap, balanced price, investor cap, market cap/thermo cap ratio, and **24 age cohort** realized prices and caps.

### Profitability (12 metrics)
NUPL, unrealized/realized P/L, SOPR — each with aggregate, LTH, and STH breakdowns.

### Coin Days (11 metrics)
Coin Days Destroyed (CDD), binary CDD, supply-adjusted CDD, liveliness, vaultedness, dormancy, dormancy flow, net coin days, coin days accumulated, transferred price, transfer volume.

### Blockchain (2 metrics)
Block height, blocks mined.

## Chart Rendering

The `render_chart` tool generates PNG charts inline in the conversation.

**Quick examples:**
```
render_chart({ metric: "price", days: 365 })
render_chart({ template: "mvrv_ratio" })
render_chart({ metrics: ["lth_supply", "sth_supply"], style: "area" })
render_chart({ metric: "dormancy_flow", overlay: "price" })
render_chart({ template: "realized_volatility", days: 730 })
```

**Annotations — reference lines and areas:**
```
render_chart({
  metric: "lth_mvrv",
  reference_lines: [
    { "y": 3.5, "label": "Overheated", "stroke": "#ef4444", "dash": "3 3" }
  ],
  reference_areas: [
    { "y1": 0, "y2": 0.85, "label": "Undervalued", "fill": "#22c55e", "fill_opacity": 0.15 }
  ]
})
```

## Example Prompts

- "What's Bitcoin's current MVRV ratio and what does it say about valuation?"
- "Show me realized volatility — is short-term vol higher than long-term?"
- "Chart dormancy flow with price overlay for the last 2 years"
- "Compare LTH and STH supply trends over 90 days"
- "Are long-dormant coins waking up? Check liveliness and CDD"
- "Show cycle performance from each halving — are we tracking historical patterns?"
- "What's the current NUPL level? Is the market in euphoria or fear?"

## Access Tiers

| Tier | History | Metrics | Daily Requests |
|------|---------|---------|----------------|
| **Demo** (no key) | 60 days | Basic (grade 0) | Unlimited |
| **Pro** ($50/mo) | Unlimited | All grade 0–1 | 10,000 |
| **Enterprise** ($900/mo) | Unlimited | All grade 0–2 | 100,000 |

## Links

- [Blocklens](https://blocklens.co)
- [Full Documentation](https://docs.blocklens.co/api/mcp-server)
- [Metrics Reference](https://docs.blocklens.co/metrics)
- [API Reference](https://api.blocklens.co/docs)
- [Get API Key](https://blocklens.co/api-keys)
- [MCP Protocol](https://modelcontextprotocol.io)

## License

MIT
