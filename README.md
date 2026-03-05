# blocklens-mcp-server

MCP (Model Context Protocol) server for [Blocklens](https://blocklens.co) crypto on-chain analytics. Connect your AI agent to 56+ on-chain metrics computed from raw blockchain data.

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

### Cursor / Windsurf

Add to your MCP config:

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

### Without API Key (Demo Mode)

Works without `BLOCKLENS_API_KEY` — you get 60 days of history for basic metrics (price, supply, valuation).

Get an API key at [blocklens.co/api-keys](https://blocklens.co/api-keys) for full access.

## Available Tools

| Tool | Description |
|------|-------------|
| `list_metrics` | List all available metrics |
| `get_prices` | BTC daily OHLC prices, market cap, volume |
| `get_holder_supply` | LTH/STH supply, circulating supply |
| `get_holder_valuation` | Realized cap/price, MVRV, unrealized P/L |
| `get_holder_profit` | Realized P/L, SOPR (Pro tier) |
| `get_cohort_metrics` | Age cohort supply/cap/price (HODL Waves) |
| `get_latest_metrics` | Latest snapshot across all categories |
| `search_metrics` | Search metrics by name/description |
| `render_chart` | Render a chart as PNG with reference lines/areas |

## Chart Annotations

### Reference Lines

Add horizontal reference lines to highlight thresholds:

```json
{
  "metric": "lth_mvrv",
  "reference_lines": [
    { "y": 3.5, "label": "Overheated", "stroke": "#ef4444", "dash": "3 3" },
    { "y": 1.0, "label": "Fair Value", "stroke": "#9ca3af" }
  ]
}
```

Parameters: `y` (static value), `y_formula` (dynamic, e.g. `"sma(m1, 200)"`), `axis_id`, `stroke` (hex color), `dash` (pattern like `"3 3"`), `label`.

### Reference Areas

Add shaded zones to highlight value ranges:

```json
{
  "metric": "lth_mvrv",
  "reference_areas": [
    { "y1": 0, "y2": 0.85, "label": "Undervalued", "fill": "#22c55e", "fill_opacity": 0.15 },
    { "y1": 3.5, "y2": 8, "label": "Overheated", "fill": "#ef4444", "fill_opacity": 0.1 }
  ]
}
```

Parameters: `y1`/`y2` (static bounds), `y1_formula`/`y2_formula` (dynamic), `axis_id`, `fill` (hex color), `fill_opacity` (0-1), `label`.

## Example Prompts

- "What's the current Bitcoin MVRV ratio and what does it indicate?"
- "Show me the LTH supply trend over the last 90 days"
- "Compare realized price across different age cohorts"
- "Is Bitcoin currently overvalued based on on-chain metrics?"
- "Chart MVRV with a red dashed line at 3.5 and green zone below 0.85"

## Metrics Categories

- **Price** (3): price, market_cap, volume
- **Supply** (15): circulating_supply, LTH/STH supply, 12 age cohorts
- **Valuation** (32): realized cap/price, MVRV, 24 age cohort valuations
- **Profit** (6): unrealized/realized P/L, SOPR (Pro tier)

## Links

- [Blocklens](https://blocklens.co)
- [API Documentation](https://api.blocklens.co/docs)
- [Metric Documentation](https://blocklens.co/docs)
- [Get API Key](https://blocklens.co/api-keys)

## License

MIT
