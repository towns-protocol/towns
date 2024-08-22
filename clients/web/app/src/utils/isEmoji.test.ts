import { isEmoji } from './isEmoji'

describe('isEmoji', () => {
    test('detects thumbs up', async () => {
        expect(isEmoji('👍')).toBe(true)
    })
    test('double emoji is not considered an emoji', async () => {
        expect(isEmoji('👍👍')).toBe(false)
    })
    test('undefined etc.', async () => {
        // @ts-expect-error testing runtime behavior
        expect(['', undefined, null, 1].every((s) => isEmoji(s))).toBe(false)
    })
    test('common emojis', async () => {
        expect(['🫥', '👻', '👨‍💼', '🧵'].every((s) => isEmoji(s))).toBe(true)
    })
    test('skin tones', async () => {
        expect(['👌', '👍🏼', '🤌🏾'].every((s) => isEmoji(s))).toBe(true)
    })
    test('regional', async () => {
        expect(['🇸🇪', '🇫🇷', '🇺🇸'].every((s) => isEmoji(s))).toBe(true)
    })
    test('strings and numbers are not emojis', async () => {
        expect(
            ['a', 'A', 'aaa', 'a b c d e f', '0', '1', '123', '.'].every((s) => isEmoji(s)),
        ).toBe(false)
    })
})
