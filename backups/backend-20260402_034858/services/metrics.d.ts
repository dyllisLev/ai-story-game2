/**
 * Simple in-memory metrics collection
 *
 * This provides basic metrics without requiring external dependencies like Prometheus.
 * Metrics can be exposed via a /metrics endpoint for monitoring systems.
 */
export interface Metric {
    name: string;
    type: 'counter' | 'gauge' | 'histogram';
    value: number;
    labels?: Record<string, string>;
    timestamp: number;
}
/**
 * Simple metrics registry
 */
export declare class MetricsRegistry {
    private counters;
    private gauges;
    private histograms;
    private static readonly MAX_HISTOGRAM_SIZE;
    /**
     * Increment a counter metric
     */
    incrementCounter(name: string, value?: number, labels?: Record<string, string>): void;
    /**
     * Set a gauge metric value
     */
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Record a value in a histogram
     */
    recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Get all metrics as an array
     */
    getMetrics(): Metric[];
    /**
     * Extract metric name from key
     */
    private extractName;
    /**
     * Reset all metrics (useful for testing)
     */
    reset(): void;
    /**
     * Generate a key from name and labels
     */
    private getKey;
    /**
     * Calculate average of values
     */
    private average;
    /**
     * Calculate percentile of values
     */
    private percentile;
}
/**
 * Get or create metrics registry
 */
export declare function getMetricsRegistry(): MetricsRegistry;
/**
 * Metric name constants
 */
export declare const MetricNames: {
    readonly HTTP_REQUESTS_TOTAL: "http_requests_total";
    readonly HTTP_REQUEST_DURATION_MS: "http_request_duration_ms";
    readonly HTTP_ERRORS_TOTAL: "http_errors_total";
    readonly HTTP_ACTIVE_REQUESTS: "http_active_requests";
    readonly DB_QUERY_DURATION_MS: "db_query_duration_ms";
    readonly DB_ERRORS_TOTAL: "db_errors_total";
    readonly ACTIVE_USERS: "active_users";
    readonly STORIES_CREATED_TOTAL: "stories_created_total";
    readonly SESSIONS_CREATED_TOTAL: "sessions_created_total";
    readonly CACHE_HITS_TOTAL: "cache_hits_total";
    readonly CACHE_MISSES_TOTAL: "cache_misses_total";
    readonly CACHE_SIZE: "cache_size";
    readonly ERRORS_TOTAL: "errors_total";
    readonly ERRORS_BY_TYPE: "errors_by_type";
};
/**
 * Helper function to track HTTP requests
 */
export declare function trackHttpRequest(method: string, path: string, statusCode: number, duration: number): void;
/**
 * Helper function to track database queries
 */
export declare function trackDatabaseQuery(table: string, operation: string, duration: number, error?: boolean): void;
/**
 * Helper function to track cache operations
 */
export declare function trackCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key?: string): void;
/**
 * Helper function to track application errors
 */
export declare function trackApplicationError(errorType: string, message: string): void;
