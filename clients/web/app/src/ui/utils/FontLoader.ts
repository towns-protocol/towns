import { precomputeValues } from '@capsizecss/vanilla-extract'
import { getTypedEntries } from './utils'

const BodyFontStyles = {
    letterSpacing: '-0.02em',
}

const HeadingFontStyles = {
    fontVariationSettings: `"wght" 1000`,
}

/**
 * initial font metrics retrieved from:
 * https://fontdrop.info/#/?darkmode=true
 */
const fontConfig = {
    BodyFont: {
        lineHeight: 19 / 15,
        // a bit arbitrary trying to find a compromise for big/small + mobile
        // webkit (hnt-1690) - need to integrate capssize the right way at some point
        systemFallback: 'sans-serif',
        fontMetrics: {
            ascent: 1150,
            descent: -350,
            lineGap: 0,
            unitsPerEm: 1000,
            capHeight: 700,
        },
    },
    MarketingFont: {
        lineHeight: 62 / 56,
        systemFallback: 'sans-serif',
        fontMetrics: {
            ascent: 800,
            descent: -165,
            lineGap: 0,
            unitsPerEm: 1000,
            capHeight: 700,
        },
    },
}

export const FontFamily = Object.fromEntries(Object.keys(fontConfig).map((key) => [key, key])) as {
    [fontName in keyof typeof fontConfig]: fontName
}

export const FontFamilyClass = Object.fromEntries(
    Object.keys(fontConfig).map((key) => [key, key]),
) as {
    [fontName in keyof typeof fontConfig]: `font-${fontName}`
}

type FontFamilySetting = {
    fontFamily: string
    systemFallback: string
    styles?: { [key: string]: string }
    src?: string
    fontDescription?: {
        weight: string
        style: string
    }
    targets: string[]
    capSize: { lineHeight: string; baselineTrim: string; capHeightTrim: string }
}

const generatedFontFamilySettings = getTypedEntries(fontConfig).reduce(
    (keep, [fontName, value]) => {
        const computed = precomputeValues({
            fontSize: 1,
            leading: value.lineHeight,
            fontMetrics: value.fontMetrics,
        })

        keep[fontName] = {
            fontFamily: fontName,
            systemFallback: value.systemFallback,
            targets: [],
            capSize: {
                // we just need the proportion
                lineHeight: computed.lineHeight.replace('px', 'em'),
                baselineTrim: computed.baselineTrim,
                capHeightTrim: computed.capHeightTrim,
            },
        }
        return keep
    },
    {} as { [fontName in keyof typeof fontConfig]: FontFamilySetting },
)

export const fontSettings: Required<FontFamilySetting>[] = [
    {
        ...generatedFontFamilySettings[FontFamily.BodyFont],
        styles: BodyFontStyles,
        src: "url('/fonts/fold-grotesque-variable-proportional-pro.woff2')",
        fontDescription: {
            weight: 'normal',
            style: 'normal',
        },
        targets: ['p', 'ul', 'ol', 'input', `.${FontFamilyClass.BodyFont}`],
    },
    {
        ...generatedFontFamilySettings[FontFamily.BodyFont],
        styles: HeadingFontStyles,
        src: "url('/fonts/fold-grotesque-variable-proportional-pro.woff2')",
        fontDescription: {
            weight: 'normal',
            style: 'normal',
        },
        targets: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', `.${FontFamilyClass.BodyFont}`],
    },
    {
        ...generatedFontFamilySettings[FontFamily.BodyFont],
        styles: { ...BodyFontStyles },
        src: "url('/fonts/fold-grotesque-variable-italic-pro.woff2')",
        fontDescription: {
            weight: 'normal',
            style: 'italic',
        },
        targets: [],
    },
    {
        ...generatedFontFamilySettings[FontFamily.MarketingFont],
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
        targets: [`.${FontFamilyClass.MarketingFont}`],
    },
]

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
