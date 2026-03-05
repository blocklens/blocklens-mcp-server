#!/usr/bin/env node

/**
 * Blocklens MCP Server
 *
 * Exposes crypto on-chain analytics to AI agents via Model Context Protocol.
 * Usage: npx @blocklens/mcp-server
 * Config env: BLOCKLENS_API_KEY (optional, demo mode without it)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { BlocklensApi } from './api.js';

const VALID_COHORTS = [
  '24h', '1d_1w', '1w_1m', '1m_3m', '3m_6m', '6m_12m',
  '1y_2y', '2y_3y', '3y_5y', '5y_7y', '7y_10y', '10y_plus',
] as const;

const api = new BlocklensApi({
  apiKey: process.env.BLOCKLENS_API_KEY,
});

const server = new McpServer({
  name: 'blocklens',
  version: '0.2.0',
});

// --- Helpers ---

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true as const,
  };
}

function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

// --- Tools ---

server.tool(
  'list_metrics',
  'List all available on-chain metrics with descriptions, categories, and tier requirements. Returns id, name, description, category, unit, endpoint, and access tier for each metric.',
  {},
  async () => {
    try {
      const result = await api.listMetrics();
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'get_prices',
  'Get daily OHLC prices (open/high/low/close in USD), market cap, and 24h trading volume. Returns one row per day, newest first.',
  {
    symbol: z.string().default('BTC').describe('Cryptocurrency symbol (default: BTC)'),
    days: z.number().int().min(1).max(10000).default(30).describe('Number of daily data points to return'),
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD). Overrides days param when set.'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),
  },
  async ({ symbol, days, start_date, end_date }) => {
    try {
      const result = await api.getPrices({ symbol, limit: days, start_date, end_date });
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'get_holder_supply',
  'Get Bitcoin holder supply breakdown: Long-Term Holder (LTH) supply, Short-Term Holder (STH) supply, and circulating supply. LTH = held >155 days, STH = held <155 days. Values in BTC.',
  {
    days: z.number().int().min(1).max(10000).default(30).describe('Number of daily data points to return'),
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD). Overrides days param when set.'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),
  },
  async ({ days, start_date, end_date }) => {
    try {
      const result = await api.getHolderSupply({ limit: days, start_date, end_date });
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'get_holder_valuation',
  'Get Bitcoin valuation metrics: Realized Cap (USD), Realized Price (USD), LTH/STH Realized Cap and Price, MVRV ratio (Market Value / Realized Value), and Unrealized P/L. MVRV > 3.5 historically signals overheating; < 1 signals undervaluation.',
  {
    days: z.number().int().min(1).max(10000).default(30).describe('Number of daily data points to return'),
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD). Overrides days param when set.'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),
  },
  async ({ days, start_date, end_date }) => {
    try {
      const result = await api.getHolderValuation({ limit: days, start_date, end_date });
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'get_holder_profit',
  'Get Bitcoin profit metrics: LTH/STH Realized P/L (USD) and SOPR (Spent Output Profit Ratio). SOPR > 1 means coins moved at profit; < 1 means at loss. Requires Pro tier API key.',
  {
    days: z.number().int().min(1).max(10000).default(30).describe('Number of daily data points to return'),
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD). Overrides days param when set.'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),
  },
  async ({ days, start_date, end_date }) => {
    try {
      const result = await api.getHolderProfit({ limit: days, start_date, end_date });
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'get_cohort_metrics',
  'Get age cohort metrics: supply (BTC), realized cap (USD), and realized price (USD) for a specific UTXO age bracket. 12 cohorts from <24h to 10y+. Used for HODL Waves analysis to track accumulation/distribution by coin age.',
  {
    cohort: z.enum(VALID_COHORTS).describe('Age cohort: 24h, 1d_1w, 1w_1m, 1m_3m, 3m_6m, 6m_12m, 1y_2y, 2y_3y, 3y_5y, 5y_7y, 7y_10y, 10y_plus'),
    days: z.number().int().min(1).max(10000).default(30).describe('Number of daily data points to return'),
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD). Overrides days param when set.'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),
  },
  async ({ cohort, days, start_date, end_date }) => {
    try {
      const result = await api.getCohortMetrics(cohort, { limit: days, start_date, end_date });
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'get_utxo_history',
  'Get UTXO set breakdown by age cohort. Shows token amounts (BTC) and USD values for each cohort date. Useful for analyzing coin dormancy and accumulation patterns — when dormant supply moves, it often precedes price action.',
  {
    date_processed: z.string().optional().describe('Specific processing date (YYYY-MM-DD). Returns the UTXO snapshot for that day.'),
    cohort_start: z.string().optional().describe('Start of cohort date range (YYYY-MM-DD)'),
    cohort_end: z.string().optional().describe('End of cohort date range (YYYY-MM-DD)'),
    days: z.number().int().min(1).max(50000).default(1000).describe('Number of records to return'),
  },
  async ({ date_processed, cohort_start, cohort_end, days }) => {
    try {
      const result = await api.getUtxoHistory({ date_processed, cohort_start, cohort_end, limit: days });
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'get_latest_metrics',
  'Get the most recent snapshot across all metric categories (price, supply, valuation, profit) in a single call. Ideal for a quick market overview without specifying date ranges.',
  {},
  async () => {
    try {
      const result = await api.getLatestMetrics();
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'search_metrics',
  'Search available metrics by name or description. Returns matching metrics with their IDs, API endpoints, access tiers, and descriptions. Use this to discover which metrics are available before fetching data.',
  {
    query: z.string().describe('Search query (e.g. "realized price", "supply", "MVRV")'),
  },
  async ({ query }) => {
    try {
      const result = await api.listMetrics();
      const metrics = result.data as Array<{
        id: string; name: string; description: string;
        short_description: string; category: string; unit: string;
        endpoint: string; field: string; grade: number;
      }>;

      const q = query.toLowerCase();
      const matches = metrics
        .filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          (m.short_description || '').toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
        )
        .map(m => ({
          id: m.id,
          name: m.name,
          description: m.short_description || m.description,
          category: m.category,
          unit: m.unit,
          endpoint: `/v1/${m.endpoint}`,
          tier: m.grade === 0 ? 'Free' : m.grade === 1 ? 'Pro' : 'Enterprise',
        }));

      return {
        content: [{
          type: 'text' as const,
          text: matches.length > 0
            ? JSON.stringify(matches, null, 2)
            : `No metrics found matching "${query}". Use list_metrics to see all available metrics.`,
        }],
      };
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'get_metric',
  'Get the full definition of a single metric by its ID. Returns name, description, category, endpoint, unit, access tier, documentation, and related metrics. Use search_metrics or list_metrics first to find metric IDs.',
  {
    metric_id: z.string().describe('Metric identifier (e.g. "lth_supply", "price", "sth_sopr")'),
  },
  async ({ metric_id }) => {
    try {
      const result = await api.getMetric(metric_id);
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'get_categories',
  'List all metric categories with counts and metric IDs in each. Categories include: price, supply, valuation, profit. Useful for discovering what data is available.',
  {},
  async () => {
    try {
      const result = await api.getMetricsCategories();
      return jsonResult(result.data);
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.tool(
  'render_chart',
  `Render a Bitcoin on-chain analytics chart as a PNG image. Supports single metrics, multiple metrics, templates, and full customization.

Use this when the user asks to "show", "chart", "plot", "graph", or "visualize" any metric.

Smart defaults: just provide metric IDs and you get a beautiful chart. Customize with optional params.

Supports reference lines (horizontal lines at specific Y values) and reference areas (shaded zones between two Y values) for highlighting thresholds, ranges, or formula-derived levels.

Examples:
- Simple: render_chart({ metric: "price" })
- Multi-metric: render_chart({ metrics: ["lth_supply", "sth_supply"], days: 730, style: "area" })
- Template: render_chart({ template: "mvrv_ratio" })
- Custom: render_chart({ metrics: [{ id: "price", axis: "right" }, { id: "lth_mvrv", axis: "left" }], days: 365, title: "Price vs MVRV" })
- Reference line: render_chart({ metric: "lth_mvrv", reference_lines: [{ y: 3.5, label: "Overheated", stroke: "#ef4444", dash: "3 3" }] })
- Reference area: render_chart({ metric: "lth_mvrv", reference_areas: [{ y1: 0, y2: 0.85, label: "Undervalued", fill: "#22c55e", fill_opacity: 0.15 }] })`,
  {
    // --- Data source (exactly one required) ---
    metric: z.string().optional().describe(
      'Single metric ID (e.g., "price", "lth_supply", "lth_mvrv"). Use list_metrics to discover IDs.'
    ),
    metrics: z.union([
      z.array(z.string()),
      z.array(z.object({
        id: z.string().describe('Metric ID from registry'),
        axis: z.enum(['left', 'right']).optional().describe('Y-axis side (auto-assigned if omitted)'),
        style: z.enum(['line', 'area', 'bar']).optional().describe('Chart style (registry default if omitted)'),
        color: z.string().optional().describe('Hex color, e.g. "#2563eb"'),
      })),
    ]).optional().describe(
      'Multiple metrics. Pass as string array ["price", "lth_supply"] for simple, or objects for customization.'
    ),
    template: z.string().optional().describe(
      'Chart template ID. Templates: price, price_volume, market_cap, holder_supply, mvrv_ratio, realized_price, realized_cap, unrealized_pl, realized_pl, sopr, block_height'
    ),

    // --- Time range ---
    days: z.number().int().min(7).max(10000).default(365).describe('Days of history (default: 365)'),
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD). Overrides days.'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),

    // --- Display ---
    overlay: z.enum(['price']).optional().describe('Add BTC price overlay (subtle dashed line)'),
    theme: z.enum(['light', 'dark']).default('light').describe('Color theme: light or dark'),
    width: z.number().int().min(600).max(2400).default(1200).describe('Image width in pixels'),
    height: z.number().int().min(300).max(1200).default(600).describe('Image height in pixels'),
    title: z.string().max(120).optional().describe('Chart title (auto-generated if omitted)'),
    style: z.enum(['line', 'area', 'bar']).optional().describe('Default chart style for all metrics'),
    scale: z.enum(['linear', 'log']).default('linear').describe('Y-axis scale'),
    format: z.enum(['png', 'json']).default('png').describe('Output format: png (image) or json (metadata)'),

    // --- Reference annotations ---
    reference_lines: z.array(z.object({
      y: z.number().optional().describe('Static Y value'),
      y_formula: z.string().optional().describe('Formula for dynamic Y value (e.g. "sma(m1, 200)")'),
      axis_id: z.string().optional().describe('Y-axis ID'),
      stroke: z.string().optional().describe('Line color hex'),
      dash: z.string().optional().describe('Dash pattern, e.g. "3 3"'),
      label: z.string().optional().describe('Label text'),
    })).optional().describe('Horizontal reference lines on the chart'),

    reference_areas: z.array(z.object({
      y1: z.number().optional().describe('Static lower Y bound'),
      y2: z.number().optional().describe('Static upper Y bound'),
      y1_formula: z.string().optional().describe('Formula for lower bound'),
      y2_formula: z.string().optional().describe('Formula for upper bound'),
      axis_id: z.string().optional().describe('Y-axis ID'),
      fill: z.string().optional().describe('Fill color hex'),
      fill_opacity: z.number().optional().describe('Fill opacity 0-1'),
      label: z.string().optional().describe('Label text'),
    })).optional().describe('Shaded reference zones between two Y values. Example: highlight when MVRV < 0.85'),
  },
  async (params) => {
    try {
      // Build request body for POST /v1/chart/snapshot
      const body: Record<string, unknown> = {};

      if (params.metric) {
        body.metric = params.metric;
      } else if (params.metrics) {
        // Normalize: string[] → {id: string}[]
        body.metrics = (params.metrics as Array<string | { id: string }>).map(m =>
          typeof m === 'string' ? { id: m } : m
        );
      } else if (params.template) {
        body.template = params.template;
      } else {
        return errorResult(new Error(
          'Provide one of: metric (string), metrics (array), or template (string). Use list_metrics to discover available metric IDs.'
        ));
      }

      body.days = params.days;
      if (params.start_date) body.start_date = params.start_date;
      if (params.end_date) body.end_date = params.end_date;
      if (params.style) body.style = params.style;
      if (params.scale !== 'linear') body.scale = params.scale;
      if (params.overlay) body.overlay = params.overlay;
      if (params.title) body.title = params.title;
      if (params.theme !== 'light') body.theme = params.theme;
      if (params.width !== 1200) body.width = params.width;
      if (params.height !== 600) body.height = params.height;

      // Reference annotations
      if (params.reference_lines) {
        body.reference_lines = params.reference_lines.map(rl => ({
          ...(rl.y !== undefined && { y: rl.y }),
          ...(rl.y_formula && { y_formula: rl.y_formula }),
          ...(rl.axis_id && { y_axis_id: rl.axis_id }),
          ...(rl.stroke && { stroke: rl.stroke }),
          ...(rl.dash && { stroke_dasharray: rl.dash }),
          ...(rl.label && { label: rl.label }),
        }));
      }
      if (params.reference_areas) {
        body.reference_areas = params.reference_areas.map(ra => ({
          ...(ra.y1 !== undefined && { y1: ra.y1 }),
          ...(ra.y2 !== undefined && { y2: ra.y2 }),
          ...(ra.y1_formula && { y1_formula: ra.y1_formula }),
          ...(ra.y2_formula && { y2_formula: ra.y2_formula }),
          ...(ra.axis_id && { y_axis_id: ra.axis_id }),
          ...(ra.fill && { fill: ra.fill }),
          ...(ra.fill_opacity !== undefined && { fill_opacity: ra.fill_opacity }),
          ...(ra.label && { label: ra.label }),
        }));
      }

      // JSON metadata format
      if (params.format === 'json') {
        body.format = 'json';
        const metadata = await api.renderSnapshotJson(body);
        return jsonResult(metadata);
      }

      // PNG image format (default)
      const pngBuffer = await api.renderSnapshot(body);

      return {
        content: [{
          type: 'image' as const,
          data: pngBuffer.toString('base64'),
          mimeType: 'image/png',
        }],
      };
    } catch (err) {
      return errorResult(err);
    }
  }
);

// --- Resources ---

server.resource(
  'metrics-catalog',
  'blocklens://metrics',
  { mimeType: 'application/json', description: 'Full catalog of all available on-chain metrics' },
  async () => {
    try {
      const result = await api.listMetrics();
      return {
        contents: [{
          uri: 'blocklens://metrics',
          mimeType: 'application/json',
          text: JSON.stringify(result.data, null, 2),
        }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        contents: [{
          uri: 'blocklens://metrics',
          mimeType: 'application/json',
          text: JSON.stringify({ error: message }),
        }],
      };
    }
  }
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Blocklens MCP server running on stdio');
  if (!process.env.BLOCKLENS_API_KEY) {
    console.error('No BLOCKLENS_API_KEY set — running in demo mode (60 days history)');
  }
}

main().catch(console.error);
