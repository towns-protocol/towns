import { ponder as originalPonder } from 'ponder:registry'

// Configuration
const SLOW_THRESHOLD_MS = 100
const LOG_METRICS = process.env.LOG_METRICS !== 'false' // default to true

// Simple metrics tracking
const eventMetrics = new Map<string, { count: number; totalMs: number; slowCount: number }>()
let globalEventCount = 0
let latestBlockNumber = 0n

// Detailed query metrics
interface DetailedQueryMetrics {
    count: number
    totalMs: number
    minMs: number
    maxMs: number
    over50msCount: number
    printInterval: number
}

const detailedQueryMetrics = new Map<string, DetailedQueryMetrics>()

// Track detailed query metrics
export function trackDetailedQuery(queryName: string, durationMs: number, printInterval = 100) {
    if (!detailedQueryMetrics.has(queryName)) {
        detailedQueryMetrics.set(queryName, {
            count: 0,
            totalMs: 0,
            minMs: Infinity,
            maxMs: 0,
            over50msCount: 0,
            printInterval,
        })
    }

    const metrics = detailedQueryMetrics.get(queryName)!
    metrics.count++
    metrics.totalMs += durationMs
    metrics.minMs = Math.min(metrics.minMs, durationMs)
    metrics.maxMs = Math.max(metrics.maxMs, durationMs)

    if (durationMs > 50) {
        metrics.over50msCount++
    }

    // Print metrics every N calls
    if (metrics.count % metrics.printInterval === 0) {
        const avg = Math.round(metrics.totalMs / metrics.count)

        console.info(
            JSON.stringify({
                type: 'detailed_query_metrics',
                query: queryName,
                count: metrics.count,
                avg_ms: avg,
                min_ms: metrics.minMs,
                max_ms: metrics.maxMs,
                over_50ms_count: metrics.over50msCount,
            }),
        )
    }
}

// Wrapped ponder with automatic metrics
export const ponder = new Proxy(originalPonder, {
    get(target, prop) {
        if (prop === 'on') {
            return <TEventName extends Parameters<typeof originalPonder.on>[0]>(
                eventName: TEventName,
                handler: Parameters<typeof originalPonder.on<TEventName>>[1],
            ) => {
                // Store the event name as a string for metrics tracking
                const eventNameStr = String(eventName)

                // Wrap the handler with metrics tracking
                const wrappedHandler = async (context: any) => {
                    const start = Date.now()
                    const blockNumber = context.event?.block?.number || 'unknown'

                    // Update latest block number
                    if (typeof blockNumber === 'bigint') {
                        latestBlockNumber = blockNumber
                    }

                    try {
                        const result = await handler(context)
                        const duration = Date.now() - start

                        // Track metrics
                        if (!eventMetrics.has(eventNameStr)) {
                            eventMetrics.set(eventNameStr, { count: 0, totalMs: 0, slowCount: 0 })
                        }
                        const metrics = eventMetrics.get(eventNameStr)!
                        metrics.count++
                        metrics.totalMs += duration
                        if (duration > SLOW_THRESHOLD_MS) {
                            metrics.slowCount++
                            console.warn(
                                `⚠️ SLOW: ${eventNameStr} at block ${blockNumber} took ${duration}ms`,
                            )
                        }

                        globalEventCount++

                        // Log summary every N events
                        if (LOG_METRICS && globalEventCount % 5000 === 0) {
                            logMetricsSummary()
                        }

                        return result
                    } catch (error) {
                        const duration = Date.now() - start
                        console.error(
                            `❌ ERROR: ${eventNameStr} at block ${blockNumber} failed after ${duration}ms`,
                        )
                        throw error
                    }
                }

                // Call the original ponder.on with wrapped handler
                return target.on(eventName, wrappedHandler)
            }
        }
        return target[prop as keyof typeof target]
    },
})

function logMetricsSummary() {
    const sorted = Array.from(eventMetrics.entries()).sort((a, b) => {
        return b[1].totalMs - a[1].totalMs // Sort by total time spent, highest first
    })

    const eventStats: Record<string, any> = {}
    for (const [event, metrics] of sorted) {
        const avg = Math.round(metrics.totalMs / metrics.count)
        eventStats[event] = {
            avg_ms: avg,
            count: metrics.count,
            slow_count: metrics.slowCount,
            total_ms: metrics.totalMs,
        }
    }

    console.log(
        JSON.stringify({
            type: 'metrics_summary',
            block: latestBlockNumber.toString(),
            total_events: globalEventCount,
            events: eventStats,
        }),
    )
}
