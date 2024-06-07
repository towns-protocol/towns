export function makeSillyMessage(opts?: { maxWords?: number }) {
    const maxWords = opts?.maxWords ?? 7
    const w0 = [
        'b',
        'd',
        'f',
        'g',
        'h',
        'j',
        'k',
        'l',
        'm',
        'n',
        'p',
        'r',
        's',
        't',
        'v',
        'w',
        'y',
        'z',
        'ch',
        'sh',
        'th',
        'zh',
        'ng',
    ]
    const w1 = ['a', 'e', 'i', 'o', 'u', 'ə', 'ɑ', 'æ', 'ɛ', 'ɪ', 'i', 'ɔ', 'ʊ', 'u', 'ʌ']
    const w2 = [
        'ai',
        'au',
        'aw',
        'ay',
        'ea',
        'ee',
        'ei',
        'eu',
        'ew',
        'ey',
        'ie',
        'oa',
        'oi',
        'oo',
        'ou',
        'ow',
        'oy',
        'ar',
        'er',
        'ir',
        'or',
        'ur',
    ]

    const wo = () =>
        w0[Math.floor(Math.random() * w0.length)] + w1[Math.floor(Math.random() * w1.length)]

    const word = () => {
        const prefix = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, wo).join('')
        const suffix = Math.random() > 0.8 ? w2[Math.floor(Math.random() * w2.length)] : ''
        return prefix + suffix
    }

    return Array.from({ length: Math.floor(Math.random() * (maxWords - 1)) + 1 }, word).join(' ')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeCodeBlock(value: any): string {
    const str = JSON.stringify(value, null, 2)
    const ticks = '```'
    return `<br>\n ${ticks}\n${str}\n${ticks}\n`
}
