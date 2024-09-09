import { MONTH_MS, SECOND_MS, YEAR_MS } from 'data/constants'
import { formatUnitsToFixedLength, parseUnits } from 'hooks/useBalance'

export const getPriceText = (price: string | undefined) => {
    if (typeof price === 'undefined') {
        return undefined
    }
    const numericPrice = parseFloat(price || '0')
    const isFree = price?.toLowerCase() === 'free' || numericPrice === 0

    return {
        value: isFree ? 'Free' : `${formatUnitsToFixedLength(parseUnits(price))}`,
        suffix: isFree ? 'First 100' : 'ETH',
    }
}

export const getDurationText = (duration?: number) => {
    if (!duration) {
        return undefined
    }

    const YEAR = YEAR_MS / SECOND_MS
    const MONTH = MONTH_MS / SECOND_MS

    if (duration >= YEAR) {
        const years = Math.floor(duration / YEAR)
        return {
            value: `${years}`,
            suffix: years === 1 ? 'Year' : 'Years',
        }
    }

    if (duration >= MONTH) {
        const months = Math.floor(duration / MONTH)
        return {
            value: `${months}`,
            suffix: months === 1 ? 'Month' : 'Months',
        }
    }

    return undefined
}
