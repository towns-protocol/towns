import { getDurationText, getPriceText } from './townPageUtils'

describe('TownPageUtilsTests', () => {
    test('should format years and months', () => {
        const duration1Year = 365 * 24 * 60 * 60
        const titleSubtitle1Year = getDurationText(duration1Year)
        expect(titleSubtitle1Year).toBeDefined()
        expect(titleSubtitle1Year!.value).toBe('1')
        expect(titleSubtitle1Year!.suffix).toBe('Year')

        const duration2Years = 365 * 24 * 60 * 60 * 2
        const titleSubtitle2Years = getDurationText(duration2Years)
        expect(titleSubtitle2Years).toBeDefined()
        expect(titleSubtitle2Years!.value).toBe('2')
        expect(titleSubtitle2Years!.suffix).toBe('Years')

        const duration1Month = 31 * 24 * 60 * 60
        const titleSubtitle1Month = getDurationText(duration1Month)
        expect(titleSubtitle1Month).toBeDefined()
        expect(titleSubtitle1Month!.value).toBe('1')
        expect(titleSubtitle1Month!.suffix).toBe('Month')

        const duration9Months = 9 * 31 * 24 * 60 * 60
        const titleSubtitle9Months = getDurationText(duration9Months)
        expect(titleSubtitle9Months).toBeDefined()
        expect(titleSubtitle9Months!.value).toBe('9')
        expect(titleSubtitle9Months!.suffix).toBe('Months')

        const titleSubtitleNoDuration = getDurationText(undefined)
        expect(titleSubtitleNoDuration).toBeUndefined()
    })

    test('should convert price 0 to text', () => {
        const price = '0'
        const remainingFreeSupply = 100
        const priceText = getPriceText(price, remainingFreeSupply)
        expect(priceText?.value).toBe('Free')
        expect(priceText?.suffix).toBe(`(Next ${remainingFreeSupply})`)
    })

    test('should respect decimals', () => {
        const price = '2.0000'
        const remainingFreeSupply = 0
        const priceText = getPriceText(price, remainingFreeSupply)
        expect(priceText?.value).toBe('2')
        expect(priceText?.suffix).toBe('ETH')
    })

    test('should respect decimals', () => {
        const price = '0.001'
        const remainingFreeSupply = 0
        const priceText = getPriceText(price, remainingFreeSupply)
        expect(priceText?.value).toBe('0.001')
        expect(priceText?.suffix).toBe('ETH')
    })

    test('should write "free"', () => {
        const price = 'Free'
        const remainingFreeSupply = 100
        const priceText = getPriceText(price, remainingFreeSupply)
        expect(priceText?.value).toBe('Free')
        expect(priceText?.suffix).toBe(`(Next ${remainingFreeSupply})`)
    })
})
