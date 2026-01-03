import { ponder as originalPonder } from 'ponder:registry'

// Configuration
const SLOW_THRESHOLD_MS = 100
const LOG_METRICS = process.env.LOG_METRICS !== 'false' // default to true

// Simple metrics tracking
const eventMetrics = new Map<string, { count: number; totalMs: number; slowCount: number }>()
const queryMetrics = new Map<string, { count: number; totalMs: number; slowCount: number }>()
let globalEventCount = 0
let latestBlockNumber = 0n

// Helper to track query metrics
function trackQuery(operation: string, table: string, durationMs: number) {
    const key = `${operation}:${table}`
    if (!queryMetrics.has(key)) {
        queryMetrics.set(key, { count: 0, totalMs: 0, slowCount: 0 })
    }
    const metrics = queryMetrics.get(key)!
    metrics.count++
    metrics.totalMs += durationMs
    if (durationMs > SLOW_THRESHOLD_MS) {
        metrics.slowCount++
        console.warn(`⚠️ SLOW QUERY: ${key} took ${durationMs}ms`)
    }
}

// Create a proxy for database operations to track query metrics
function createDbProxy(db: any, _eventName: string): any {
    return new Proxy(db, {
        get(target, prop) {
            // Handle direct operations: insert, update, delete
            if (prop === 'insert') {
                return (schema: any) => {
                    const tableName = schema?.constructor?.name || 'unknown'
                    const start = Date.now()

                    const result = target.insert(schema)

                    // Wrap the chained methods
                    return new Proxy(result, {
                        get(insertTarget, insertProp) {
                            if (typeof insertTarget[insertProp] === 'function') {
                                return (...args: any[]) => {
                                    const chainedResult = insertTarget[insertProp](...args)

                                    // Track timing when the query executes (returns Promise)
                                    if (chainedResult && typeof chainedResult.then === 'function') {
                                        return chainedResult.then((res: any) => {
                                            const duration = Date.now() - start
                                            trackQuery('insert', tableName, duration)
                                            return res
                                        })
                                    }

                                    return chainedResult
                                }
                            }
                            return insertTarget[insertProp]
                        },
                    })
                }
            }

            // Handle sql operations: sql.query, sql.update, sql.delete
            if (prop === 'sql') {
                return new Proxy(target.sql, {
                    get(sqlTarget, sqlProp) {
                        // Handle sql.query (SELECT operations)
                        if (sqlProp === 'query') {
                            return new Proxy(sqlTarget.query, {
                                get(queryTarget, tableName) {
                                    const tableProxy = queryTarget[tableName]
                                    if (!tableProxy) return tableProxy

                                    return new Proxy(tableProxy, {
                                        get(tableTarget, method) {
                                            if (
                                                typeof tableTarget[method] === 'function' &&
                                                (method === 'findFirst' ||
                                                    method === 'findMany' ||
                                                    method === 'findUnique')
                                            ) {
                                                return async (...args: any[]) => {
                                                    const start = Date.now()
                                                    const result = await tableTarget[method](
                                                        ...args,
                                                    )
                                                    const duration = Date.now() - start
                                                    trackQuery(
                                                        String(method),
                                                        String(tableName),
                                                        duration,
                                                    )
                                                    return result
                                                }
                                            }
                                            return tableTarget[method]
                                        },
                                    })
                                },
                            })
                        }

                        // Handle sql.update
                        if (sqlProp === 'update') {
                            return (schema: any) => {
                                const tableName = schema?.constructor?.name || 'unknown'
                                const start = Date.now()

                                const result = sqlTarget.update(schema)

                                // Wrap the chained methods
                                return new Proxy(result, {
                                    get(updateTarget, updateProp) {
                                        if (typeof updateTarget[updateProp] === 'function') {
                                            return (...args: any[]) => {
                                                const chainedResult = updateTarget[updateProp](
                                                    ...args,
                                                )

                                                // Track timing when the query executes
                                                if (
                                                    chainedResult &&
                                                    typeof chainedResult.then === 'function'
                                                ) {
                                                    return chainedResult.then((res: any) => {
                                                        const duration = Date.now() - start
                                                        trackQuery('update', tableName, duration)
                                                        return res
                                                    })
                                                }

                                                return chainedResult
                                            }
                                        }
                                        return updateTarget[updateProp]
                                    },
                                })
                            }
                        }

                        // Handle sql.delete
                        if (sqlProp === 'delete') {
                            return (schema: any) => {
                                const tableName = schema?.constructor?.name || 'unknown'
                                const start = Date.now()

                                const result = sqlTarget.delete(schema)

                                // Wrap the chained methods
                                return new Proxy(result, {
                                    get(deleteTarget, deleteProp) {
                                        if (typeof deleteTarget[deleteProp] === 'function') {
                                            return (...args: any[]) => {
                                                const chainedResult = deleteTarget[deleteProp](
                                                    ...args,
                                                )

                                                // Track timing when the query executes
                                                if (
                                                    chainedResult &&
                                                    typeof chainedResult.then === 'function'
                                                ) {
                                                    return chainedResult.then((res: any) => {
                                                        const duration = Date.now() - start
                                                        trackQuery('delete', tableName, duration)
                                                        return res
                                                    })
                                                }

                                                return chainedResult
                                            }
                                        }
                                        return deleteTarget[deleteProp]
                                    },
                                })
                            }
                        }

                        return sqlTarget[sqlProp]
                    },
                })
            }

            return target[prop]
        },
    })
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

                    // Wrap the database context with metrics proxy
                    const wrappedContext = {
                        ...context,
                        db: createDbProxy(context.db, eventNameStr),
                    }

                    try {
                        const result = await handler(wrappedContext)
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

    // Process query metrics
    const sortedQueries = Array.from(queryMetrics.entries()).sort((a, b) => {
        return b[1].totalMs - a[1].totalMs // Sort by total time spent, highest first
    })

    const queryStats: Record<string, any> = {}
    for (const [query, metrics] of sortedQueries) {
        const avg = Math.round(metrics.totalMs / metrics.count)
        queryStats[query] = {
            avg_ms: avg,
            count: metrics.count,
            slow_count: metrics.slowCount,
            total_ms: metrics.totalMs,
        }
    }

    console.info(
        JSON.stringify({
            type: 'metrics_summary',
            block: latestBlockNumber.toString(),
            total_events: globalEventCount,
            events: eventStats,
            queries: queryStats,
        }),
    )
}
