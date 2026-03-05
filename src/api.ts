/**
 * Blocklens API client
 */

const BASE_URL = 'https://api.blocklens.co/v1';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 1000;
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);

export interface ApiOptions {
  apiKey?: string;
  baseUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  timestamp: string;
}

export interface QueryParams {
  limit?: number;
  start_date?: string;
  end_date?: string;
  [key: string]: string | number | boolean | undefined;
}

export class BlocklensApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'BlocklensApiError';
  }
}

export class BlocklensApi {
  private apiKey?: string;
  private baseUrl: string;

  constructor(options: ApiOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || BASE_URL;
  }

  private async fetch<T>(path: string, params: QueryParams = {}): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'blocklens-mcp-server/0.2.0',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_MS * attempt));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await globalThis.fetch(url.toString(), {
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          const apiError = new BlocklensApiError(
            `Blocklens API error ${response.status}: ${text}`,
            response.status,
            RETRYABLE_STATUS_CODES.has(response.status),
          );

          if (apiError.retryable && attempt < MAX_RETRIES) {
            lastError = apiError;
            continue;
          }

          throw apiError;
        }

        const body = await response.json() as ApiResponse<T>;

        if (!body.success) {
          throw new Error(`Blocklens API returned error: ${body.message || 'Unknown error'}`);
        }

        return body;
      } catch (err) {
        // Don't retry non-retryable API errors (401, 403, 404, etc.)
        if (err instanceof BlocklensApiError && !err.retryable) {
          throw err;
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new Error(`Blocklens API request timed out after ${REQUEST_TIMEOUT_MS}ms`);
          if (attempt < MAX_RETRIES) continue;
          throw lastError;
        }

        // Network errors are retryable
        if (attempt < MAX_RETRIES && !(err instanceof BlocklensApiError)) {
          lastError = err instanceof Error ? err : new Error(String(err));
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error('Blocklens API request failed');
  }

  async listMetrics(): Promise<ApiResponse<unknown[]>> {
    return this.fetch('/metrics', { active_only: true });
  }

  async getMetric(metricId: string): Promise<ApiResponse<unknown>> {
    return this.fetch(`/metrics/${encodeURIComponent(metricId)}`);
  }

  async getMetricsCategories(params: { active_only?: boolean } = {}): Promise<ApiResponse<unknown[]>> {
    return this.fetch('/metrics/categories', { active_only: params.active_only ?? true });
  }

  async getPrices(params: QueryParams = {}): Promise<ApiResponse<unknown[]>> {
    return this.fetch('/prices', params);
  }

  async getHolderSupply(params: QueryParams = {}): Promise<ApiResponse<unknown[]>> {
    return this.fetch('/holder/supply', params);
  }

  async getHolderValuation(params: QueryParams = {}): Promise<ApiResponse<unknown[]>> {
    return this.fetch('/holder/valuation', params);
  }

  async getHolderProfit(params: QueryParams = {}): Promise<ApiResponse<unknown[]>> {
    return this.fetch('/holder/profit', params);
  }

  async getCohortMetrics(cohort: string, params: QueryParams = {}): Promise<ApiResponse<unknown[]>> {
    return this.fetch(`/cohort/metrics/${encodeURIComponent(cohort)}`, params);
  }

  async getUtxoHistory(params: QueryParams = {}): Promise<ApiResponse<unknown[]>> {
    return this.fetch('/utxo/history', params);
  }

  async getLatestMetrics(): Promise<ApiResponse<unknown>> {
    return this.fetch('/metrics/latest');
  }

  private async postSnapshot(
    body: Record<string, unknown>,
    accept: string,
  ): Promise<globalThis.Response> {
    const url = `${this.baseUrl}/chart/snapshot`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': accept,
      'User-Agent': 'blocklens-mcp-server/0.2.0',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_MS * attempt));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await globalThis.fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          const apiError = new BlocklensApiError(
            `Snapshot API error ${response.status}: ${text}`,
            response.status,
            RETRYABLE_STATUS_CODES.has(response.status),
          );

          if (apiError.retryable && attempt < MAX_RETRIES) {
            lastError = apiError;
            continue;
          }

          throw apiError;
        }

        return response;
      } catch (err) {
        if (err instanceof BlocklensApiError && !err.retryable) {
          throw err;
        }

        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = new Error(`Snapshot request timed out after ${REQUEST_TIMEOUT_MS}ms`);
          if (attempt < MAX_RETRIES) continue;
          throw lastError;
        }

        if (attempt < MAX_RETRIES && !(err instanceof BlocklensApiError)) {
          lastError = err instanceof Error ? err : new Error(String(err));
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error('Snapshot API request failed');
  }

  async renderSnapshot(body: Record<string, unknown>): Promise<Buffer> {
    const response = await this.postSnapshot(body, 'image/png');
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async renderSnapshotJson(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await this.postSnapshot(body, 'application/json');
    return await response.json() as Record<string, unknown>;
  }
}
