import { TownsAnalytics } from './types/TownsAnalytics'
import { nanoid } from 'nanoid'
import { datadogLogs } from '@datadog/browser-logs'

class TimeTracker {
    public townsAnalytics: TownsAnalytics | undefined
    private metrics: {
        [key: string]: {
            count: number
            totalDurationMs: number
            totalDurationSec: number
            startTime: number | undefined
            sequenceId: string
            steps: {
                [key: string]: {
                    count: number
                    totalDurationMs: number
                    totalDurationSec: number
                    startTime: number | undefined
                }
            }
        }
    }

    constructor(analytics?: TownsAnalytics) {
        this.metrics = {}
        this.townsAnalytics = analytics
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.listSequenceTimes = this.getAllMetrics.bind(this)
    }

    public startMeasurement(
        sequence: TimeTrackerEvents,
        step: string,
        data?: Record<string, unknown>,
    ) {
        try {
            if (!sequence) {
                console.error('Measurement name is required.')
                return
            }
            const now = performance.now()

            if (!this.metrics[sequence]) {
                this.metrics[sequence] = {
                    count: 1,
                    totalDurationMs: 0,
                    totalDurationSec: 0,
                    startTime: now,
                    sequenceId: nanoid(),
                    steps: {
                        [step]: {
                            count: 1,
                            totalDurationMs: 0,
                            totalDurationSec: 0,
                            startTime: now,
                        },
                    },
                }
            } else if (!this.metrics[sequence].steps[step]) {
                this.metrics[sequence].steps[step] = {
                    count: 1,
                    totalDurationMs: 0,
                    totalDurationSec: 0,
                    startTime: now,
                }
            } else {
                this.metrics[sequence].steps[step].count++
                this.metrics[sequence].steps[step].startTime = now
            }

            // reset
            // sequence of type already exists
            // new one sequence starting
            if (!this.metrics[sequence].startTime) {
                this.metrics[sequence].sequenceId = nanoid()
                this.metrics[sequence].startTime = now
                this.metrics[sequence].count++
            }

            return () => this.endMeasurement(sequence, step, data)
        } catch (error) {
            console.error('Error starting measurement:', error)
        }
    }

    public endMeasurement(sequence: string, step: string, data?: Record<string, unknown>): void {
        try {
            if (!sequence || !this.metrics[sequence]) {
                console.error(`Measurement "${sequence}" not found or not started.`)
                return
            }

            const stepStartTime = this.metrics[sequence].steps[step].startTime
            if (stepStartTime === undefined) {
                console.error(`Measurement "${sequence}" not started.`)
                return
            }

            const endTime = performance.now()
            const durationMs = endTime - stepStartTime
            const durationSec = durationMs / 1000

            this.metrics[sequence].totalDurationMs += durationMs
            this.metrics[sequence].totalDurationSec += durationSec
            this.metrics[sequence].steps[step].totalDurationMs += durationMs
            this.metrics[sequence].steps[step].totalDurationSec += durationSec

            // Reset start time
            this.metrics[sequence].steps[step].startTime = undefined

            try {
                datadogLogs.logger.info(`sequence_time: ${sequence} ${step} ${durationMs}ms`, {
                    sequence,
                    step,
                    sequenceId: this.metrics[sequence].sequenceId,
                    durationMs,
                    ...data,
                })
            } catch (error) {
                console.log('[SequenceTimeTracker] Error logging sequence time:', error)
            }
        } catch (error) {
            console.error('Error ending measurement:', error)
        }
    }

    public getMetric(sequence: string) {
        if (!sequence || !this.metrics[sequence]) {
            console.error(`Measurement "${sequence}" not found.`)
            return null
        }

        const avgSequenceDurationMs =
            this.metrics[sequence].totalDurationMs / this.metrics[sequence].count

        const steps = Object.entries(this.metrics[sequence].steps)
            .map(([stepName, stepMetrics]) => {
                const stepDurationMs = stepMetrics.totalDurationMs
                const averageDurationMs =
                    stepMetrics.count > 0 ? stepDurationMs / stepMetrics.count : 0

                return {
                    stepName,
                    count: stepMetrics.count,
                    totalDurationMs: stepDurationMs,
                    averageDurationMs,
                }
            })
            .sort((a, b) => b.totalDurationMs - a.totalDurationMs)

        return {
            count: this.metrics[sequence].count,
            totalDurationMs: this.metrics[sequence].totalDurationMs,
            averageDurationMs: avgSequenceDurationMs,
            steps,
        }
    }

    public getAllMetrics() {
        return Object.keys(this.metrics).reduce<
            Record<string, ReturnType<TimeTracker['getMetric']>>
        >((acc, sequence) => {
            const seq = this.getMetric(sequence)
            if (!seq) {
                return acc
            }
            acc[sequence] = seq
            return acc
        }, {})
    }

    public clearMetrics(): void {
        this.metrics = {}
    }
}

let instance: TimeTracker | undefined

export const getTimeTracker = (analytics?: TownsAnalytics) => {
    if (!instance) {
        instance = new TimeTracker(analytics)
    }
    return instance
}

export const TimeTrackerEvents = {
    CREATE_SPACE: 'CREATE_SPACE',
    JOIN_SPACE: 'JOIN_SPACE',
} as const

export type TimeTrackerEvents = keyof typeof TimeTrackerEvents

export type StartMeasurementReturn = ReturnType<TimeTracker['startMeasurement']>
