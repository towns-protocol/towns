import {
    differenceInDays,
    differenceInHours,
    differenceInMinutes,
    format,
    isThisYear,
    isToday,
} from 'date-fns'
import { DAY_MS, HOUR_MS } from 'data/constants'

export function formatShortDate(date: number | Date) {
    if (isToday(date)) {
        return format(date, 'p')
    } else if (differenceInDays(7, date)) {
        return format(date, 'iii')
    } else if (isThisYear(date)) {
        return format(date, 'MM/dd')
    } else {
        return format(date, 'MM/dd/yy')
    }
}

export function formatDate(date: number | Date) {
    return format(date, 'PP')
}

export function formatUptime(date: Date) {
    const now = Date.now()
    const diff = now - date.getTime()
    switch (true) {
        case diff < HOUR_MS: {
            return differenceInMinutes(now, date) + 'm'
        }
        case diff < DAY_MS: {
            return differenceInHours(now, date) + 'h'
        }
        default: {
            return differenceInDays(now, date) + 'd'
        }
    }
}
