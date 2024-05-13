class PerformanceMetrics {
    private metrics: {
        [key: string]: {
            count: number
            totalDurationMs: number
            totalDurationSec: number
            startTime: number | undefined
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

    constructor() {
        this.metrics = {}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.listPerformanceMetrics = this.getAllMetrics.bind(this)
    }

    public startMeasurement(sequence: string, step: string): void {
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

            if (!this.metrics[sequence].startTime) {
                this.metrics[sequence].startTime = now
                this.metrics[sequence].count++
            }
        } catch (error) {
            console.error('Error starting measurement:', error)
        }
    }

    public endMeasurement(sequence: string, step: string, endSequence?: boolean): void {
        try {
            if (!sequence || !this.metrics[sequence]) {
                console.error(`Measurement "${sequence}" not found or not started.`)
                return
            }

            const startTime = this.metrics[sequence].steps[step].startTime
            if (startTime === undefined) {
                console.error(`Measurement "${sequence}" not started.`)
                return
            }

            const endTime = performance.now()
            const durationMs = endTime - startTime
            const durationSec = durationMs / 1000

            this.metrics[sequence].totalDurationMs += durationMs
            this.metrics[sequence].totalDurationSec += durationSec
            this.metrics[sequence].steps[step].totalDurationMs += durationMs
            this.metrics[sequence].steps[step].totalDurationSec += durationSec

            // Reset start time
            this.metrics[sequence].steps[step].startTime = undefined
            if (endSequence) {
                this.metrics[sequence].startTime = undefined
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
            Record<string, ReturnType<PerformanceMetrics['getMetric']>>
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

export const performanceMetrics = new PerformanceMetrics()

export const Events = {
    CREATE_SPACE: 'CREATE_SPACE',
    JOIN_TOWN: 'JOIN_TOWN',
} as const
