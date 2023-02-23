export const FontFamily = {
    TitleFont: 'TitleFont',
    BodyFont: 'BodyFont',
} as const

const BodyFontCapSize = {
    trimTop: '-0.26em',
    trimBottom: '-0.24em',
    lineHeight: '1.24em',
}

const BodyFontStyles = {
    letterSpacing: '-0.02em',
}

export const fontSettings = [
    {
        fontFamily: FontFamily.BodyFont,
        styles: BodyFontStyles,
        src: "url('/fonts/fold-grotesque-variable-proportional-pro.woff2')",
        fontDescription: {
            weight: 'normal',
            style: 'normal',
        },
        targets: ['p', 'ul', 'ol', 'h3', 'h4', 'h5', 'h6'],
        capSize: BodyFontCapSize,
    },
    {
        fontFamily: FontFamily.BodyFont,
        styles: { ...BodyFontStyles },
        src: "url('/fonts/fold-grotesque-variable-italic-pro.woff2')",
        fontDescription: {
            weight: 'normal',
            style: 'italic',
        },
        targets: [],
        capSize: BodyFontCapSize,
    },
    {
        fontFamily: FontFamily.TitleFont,
        src: "url('/fonts/Byrd-Black.woff2')",
        styles: {
            letterSpacing: '0',
            fontDisplay: 'optional',
            textTransform: 'uppercase',
        },
        fontDescription: {
            weight: 'bold',
            style: 'normal',
        },
        targets: ['h1', 'h2'],

        capSize: {
            trimTop: '-0.2em',
            trimBottom: '-0.35em',
            lineHeight: '1.20em',
        },
    },
] as const

let isInit = false

export const FontLoader = {
    init() {
        if (isInit) {
            return
        }
        isInit = true
        fontSettings.forEach((f) => {
            const font = new FontFace(f.fontFamily, f.src, f.fontDescription)
            document.fonts.add(font)
            font.load()
        })
    },
}
