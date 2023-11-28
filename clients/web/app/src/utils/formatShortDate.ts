import { differenceInDays, format, isThisYear, isToday } from 'date-fns'

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
