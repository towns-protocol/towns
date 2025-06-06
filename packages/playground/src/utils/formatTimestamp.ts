import { format, formatDistance } from 'date-fns'

export function formatTimestamp(timestamp: number, formatType: 'absolute' | 'relative'): string {
    const date = new Date(timestamp)
    
    if (formatType === 'absolute') {
        return format(date, 'h:mm a')
    } else {
        return formatDistance(timestamp, Date.now(), {
            addSuffix: true,
        })
    }
}
