// backend/src/services/metrics.ts
/**
 * Simple in-memory metrics collection
 *
 * This provides basic metrics without requiring external dependencies like Prometheus.
 * Metrics can be exposed via a /metrics endpoint for monitoring systems.
 */
/**
 * Simple metrics registry
 */
export class MetricsRegistry {
    counters = new Map();
    gauges = new Map();
    histograms = new Map();
    static MAX_HISTOGRAM_SIZE = 10000; // Prevent unbounded growth
    /**
     * Increment a counter metric
     */
    incrementCounter(name, value = 1, labels) {
        const key = this.getKey(name, labels);
        const current = this.counters.get(key);
        if (current) {
            current.value += value;
        }
        else {
            this.counters.set(key, { value, labels: labels || {} });
        }
    }
    /**
     * Set a gauge metric value
     */
    setGauge(name, value, labels) {
        const key = this.getKey(name, labels);
        this.gauges.set(key, { value, labels: labels || {} });
    }
    /**
     * Record a value in a histogram
     */
    recordHistogram(name, value, labels) {
        const key = this.getKey(name, labels);
        const current = this.histograms.get(key);
        if (current) {
            // Add value and enforce size limit to prevent unbounded memory growth
            current.values.push(value);
            if (current.values.length > MetricsRegistry.MAX_HISTOGRAM_SIZE) {
                // Remove oldest value (FIFO) to keep size bounded
                current.values.shift();
            }
        }
        else {
            this.histograms.set(key, { values: [value], labels: labels || {} });
        }
    }
    /**
     * Get all metrics as an array
     */
    getMetrics() {
        const metrics = [];
        const now = Date.now();
        // Counters
        for (const [key, counter] of this.counters) {
            const name = this.extractName(key);
            metrics.push({
                name,
                type: 'counter',
                value: counter.value,
                labels: counter.labels,
                timestamp: now,
            });
        }
        // Gauges
        for (const [key, gauge] of this.gauges) {
            const name = this.extractName(key);
            metrics.push({
                name,
                type: 'gauge',
                value: gauge.value,
                labels: gauge.labels,
                timestamp: now,
            });
        }
        // Histograms (with percentiles)
        for (const [key, histogram] of this.histograms) {
            const name = this.extractName(key);
            // Create a copy before sorting to avoid mutating the stored array
            const values = [...histogram.values].sort((a, b) => a - b);
            metrics.push({ name: `${name}_count`, type: 'counter', value: values.length, labels: histogram.labels, timestamp: now }, { name: `${name}_sum`, type: 'counter', value: values.reduce((a, b) => a + b, 0), labels: histogram.labels, timestamp: now }, { name: `${name}_avg`, type: 'gauge', value: this.average(values), labels: histogram.labels, timestamp: now }, { name: `${name}_p50`, type: 'gauge', value: this.percentile(values, 50), labels: histogram.labels, timestamp: now }, { name: `${name}_p95`, type: 'gauge', value: this.percentile(values, 95), labels: histogram.labels, timestamp: now }, { name: `${name}_p99`, type: 'gauge', value: this.percentile(values, 99), labels: histogram.labels, timestamp: now });
        }
        return metrics;
    }
    /**
     * Extract metric name from key
     */
    extractName(key) {
        const idx = key.indexOf('{');
        return idx >= 0 ? key.substring(0, idx) : key;
    }
    /**
     * Reset all metrics (useful for testing)
     */
    reset() {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
    }
    /**
     * Generate a key from name and labels
     */
    getKey(name, labels) {
        if (!labels || Object.keys(labels).length === 0) {
            return name;
        }
        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        return `${name}{${labelStr}}`;
    }
    /**
     * Calculate average of values
     */
    average(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    /**
     * Calculate percentile of values
     */
    percentile(values, p) {
        if (values.length === 0)
            return 0;
        const index = Math.ceil((p / 100) * values.length) - 1;
        return values[index];
    }
}
// Global metrics registry instance
let metricsRegistry = null;
/**
 * Get or create metrics registry
 */
export function getMetricsRegistry() {
    if (!metricsRegistry) {
        metricsRegistry = new MetricsRegistry();
    }
    return metricsRegistry;
}
/**
 * Metric name constants
 */
export const MetricNames = {
    // HTTP metrics
    HTTP_REQUESTS_TOTAL: 'http_requests_total',
    HTTP_REQUEST_DURATION_MS: 'http_request_duration_ms',
    HTTP_ERRORS_TOTAL: 'http_errors_total',
    HTTP_ACTIVE_REQUESTS: 'http_active_requests',
    // Database metrics
    DB_QUERY_DURATION_MS: 'db_query_duration_ms',
    DB_ERRORS_TOTAL: 'db_errors_total',
    // Application metrics
    ACTIVE_USERS: 'active_users',
    STORIES_CREATED_TOTAL: 'stories_created_total',
    SESSIONS_CREATED_TOTAL: 'sessions_created_total',
    // Cache metrics
    CACHE_HITS_TOTAL: 'cache_hits_total',
    CACHE_MISSES_TOTAL: 'cache_misses_total',
    CACHE_SIZE: 'cache_size',
    // Error tracking
    ERRORS_TOTAL: 'errors_total',
    ERRORS_BY_TYPE: 'errors_by_type',
};
/**
 * Helper function to track HTTP requests
 */
export function trackHttpRequest(method, path, statusCode, duration) {
    const registry = getMetricsRegistry();
    const labels = {
        method,
        path,
        status: statusCode.toString(),
    };
    registry.incrementCounter(MetricNames.HTTP_REQUESTS_TOTAL, 1, labels);
    if (statusCode >= 400) {
        registry.incrementCounter(MetricNames.HTTP_ERRORS_TOTAL, 1, labels);
    }
    registry.recordHistogram(MetricNames.HTTP_REQUEST_DURATION_MS, duration, labels);
}
/**
 * Helper function to track database queries
 */
export function trackDatabaseQuery(table, operation, duration, error) {
    const registry = getMetricsRegistry();
    const labels = { table, operation };
    registry.recordHistogram(MetricNames.DB_QUERY_DURATION_MS, duration, labels);
    if (error) {
        registry.incrementCounter(MetricNames.DB_ERRORS_TOTAL, 1, labels);
    }
}
/**
 * Helper function to track cache operations
 */
export function trackCacheOperation(operation, key) {
    const registry = getMetricsRegistry();
    const labels = key ? { operation, key } : { operation };
    if (operation === 'hit') {
        registry.incrementCounter(MetricNames.CACHE_HITS_TOTAL, 1, labels);
    }
    else if (operation === 'miss') {
        registry.incrementCounter(MetricNames.CACHE_MISSES_TOTAL, 1, labels);
    }
}
/**
 * Helper function to track application errors
 */
export function trackApplicationError(errorType, message) {
    const registry = getMetricsRegistry();
    const labels = { type: errorType };
    registry.incrementCounter(MetricNames.ERRORS_TOTAL, 1, labels);
    registry.incrementCounter(MetricNames.ERRORS_BY_TYPE, 1, labels);
}
//# sourceMappingURL=metrics.js.map