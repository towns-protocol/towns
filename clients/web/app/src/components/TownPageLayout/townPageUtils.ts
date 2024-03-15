import { MONTH_MS, SECOND_MS, YEAR_MS } from 'data/constants'

export function durationTitleSubtitle(duration?: number) {
    if (!duration) {
        return undefined
    }

    const YEAR = YEAR_MS / SECOND_MS
    const MONTH = MONTH_MS / SECOND_MS

    if (duration >= YEAR) {
        const years = Math.floor(duration / YEAR)
        return {
            title: `${years}`,
            subtitle: years === 1 ? 'Year' : 'Years',
        }
    }

    if (duration >= MONTH) {
        const months = Math.floor(duration / MONTH)
        return {
            title: `${months}`,
            subtitle: months === 1 ? 'Month' : 'Months',
        }
    }

    return undefined
}
