import { ponder as originalPonder } from 'ponder:registry'

// Configuration
const SLOW_THRESHOLD_MS = 3000
const LOG_METRICS = process.env.LOG_METRICS !== 'false' // default to true

// Simple metrics tracking
const eventMetrics = new Map<string, { count: number; totalMs: number; slowCount: number }>()
let globalEventCount = 0

// Wrapped ponder with automatic metrics
export const ponder = new Proxy(originalPonder, {
    get(target, prop) {
        if (prop === 'on') {
            return (eventName: string, handler: any) => {
                // Wrap the handler with metrics tracking
                const wrappedHandler = async (context: any) => {
                    const start = Date.now()
                    const blockNumber = context.event?.block?.number || 'unknown'

                    try {
                        const result = await handler(context)
                        const duration = Date.now() - start

                        // Track metrics
                        if (!eventMetrics.has(eventName)) {
                            eventMetrics.set(eventName, { count: 0, totalMs: 0, slowCount: 0 })
                        }
                        const metrics = eventMetrics.get(eventName)!
                        metrics.count++
                        metrics.totalMs += duration
                        if (duration > SLOW_THRESHOLD_MS) {
                            metrics.slowCount++
                            console.warn(
                                `⚠️ SLOW: ${eventName} at block ${blockNumber} took ${duration}ms`,
                            )
                        }

                        globalEventCount++

                        // Log summary every 100 events
                        if (LOG_METRICS && globalEventCount % 100 === 0) {
                            logMetricsSummary()
                        }

                        return result
                    } catch (error) {
                        const duration = Date.now() - start
                        console.error(
                            `❌ ERROR: ${eventName} at block ${blockNumber} failed after ${duration}ms`,
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
    console.log('\n📊 Performance Summary:')
    console.log('========================')

    const sorted = Array.from(eventMetrics.entries()).sort((a, b) => {
        const avgA = a[1].totalMs / a[1].count
        const avgB = b[1].totalMs / b[1].count
        return avgB - avgA // Sort by average time, slowest first
    })

    for (const [event, metrics] of sorted) {
        const avg = Math.round(metrics.totalMs / metrics.count)
        const slowPct = ((metrics.slowCount / metrics.count) * 100).toFixed(1)
        console.log(
            `${event}: avg=${avg}ms, count=${metrics.count}, slow=${metrics.slowCount} (${slowPct}%)`,
        )
    }
    console.log('========================\n')
}

// Export metrics for external access if needed
export function getMetrics() {
    return {
        events: Object.fromEntries(eventMetrics),
        totalEvents: globalEventCount,
    }
}
