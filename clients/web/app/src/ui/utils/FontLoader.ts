export const FontFamily = {
    TitleFont: 'TitleFont',
    BodyFont: 'BodyFont',
} as const

const AkkuratCapSize = {
    trimTop: '-0.26em',
    trimBottom: '-0.24em',
    lineHeight: '1.24em',
}

const AkkuratStyles = {
    letterSpacing: '-0.02em',
}

export const fontSettings = [
    {
        fontFamily: FontFamily.BodyFont,
        styles: AkkuratStyles,
        src: "url('/fonts/AkkuratLLWeb-Regular.woff2')",
        fontDescription: {
            weight: 'normal',
            style: 'normal',
        },
        targets: ['p', 'ul', 'ol', 'h3', 'h4', 'h5', 'h6'],
        capSize: AkkuratCapSize,
    },
    {
        fontFamily: FontFamily.BodyFont,
        styles: { ...AkkuratStyles },
        src: "url('/fonts/AkkuratLLWeb-Italic.woff2')",
        fontDescription: {
            weight: 'normal',
            style: 'italic',
        },
        targets: [],
        capSize: AkkuratCapSize,
    },
    {
        fontFamily: FontFamily.BodyFont,
        styles: { ...AkkuratStyles },
        src: "url('/fonts/AkkuratLLWeb-Bold.woff2')",
        fontDescription: {
            weight: '600',
            style: 'normal',
        },
        targets: ['p', 'ul', 'ol', 'h3', 'h4', 'h5', 'h6'],
        capSize: AkkuratCapSize,
    },
    {
        fontFamily: FontFamily.TitleFont,
        src: "url('/fonts/MangoGrotesque-Black.ttf')",
        styles: {
            letterSpacing: '0',
        },
        fontDescription: {
            weight: 'bold',
            style: 'normal',
        },
        targets: ['h1', 'h2'],
        capSize: {
            trimTop: '-0.2em',
            trimBottom: '-0.35em',
            lineHeight: '1.24em',
        },
    },
] as const

let isInit = false

export const FontLoader = {
    init() {
        if (isInit) return
        isInit = true
        fontSettings.forEach((f) => {
            const font = new FontFace(f.fontFamily, f.src, f.fontDescription)
            document.fonts.add(font)
        })
    },
}
