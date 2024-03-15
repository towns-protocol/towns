import { durationTitleSubtitle } from './townPageUtils'

describe('TownPageUtilsTests', () => {
    test('should format years and months', () => {
        const duration1Year = 365 * 24 * 60 * 60
        const titleSubtitle1Year = durationTitleSubtitle(duration1Year)
        expect(titleSubtitle1Year).toBeDefined()
        expect(titleSubtitle1Year!.title).toBe('1')
        expect(titleSubtitle1Year!.subtitle).toBe('Year')

        const duration2Years = 365 * 24 * 60 * 60 * 2
        const titleSubtitle2Years = durationTitleSubtitle(duration2Years)
        expect(titleSubtitle2Years).toBeDefined()
        expect(titleSubtitle2Years!.title).toBe('2')
        expect(titleSubtitle2Years!.subtitle).toBe('Years')

        const duration1Month = 31 * 24 * 60 * 60
        const titleSubtitle1Month = durationTitleSubtitle(duration1Month)
        expect(titleSubtitle1Month).toBeDefined()
        expect(titleSubtitle1Month!.title).toBe('1')
        expect(titleSubtitle1Month!.subtitle).toBe('Month')

        const duration9Months = 9 * 31 * 24 * 60 * 60
        const titleSubtitle9Months = durationTitleSubtitle(duration9Months)
        expect(titleSubtitle9Months).toBeDefined()
        expect(titleSubtitle9Months!.title).toBe('9')
        expect(titleSubtitle9Months!.subtitle).toBe('Months')

        const titleSubtitleNoDuration = durationTitleSubtitle(undefined)
        expect(titleSubtitleNoDuration).toBeUndefined()
    })
})
