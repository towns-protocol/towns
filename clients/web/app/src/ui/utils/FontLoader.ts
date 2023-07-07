import { precomputeValues } from '@capsizecss/vanilla-extract'
import { getTypedEntries } from './utils'

const BodyFontStyles = {
    letterSpacing: '-0.02em',
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

        fontMetrics: {
            ascent: 1150,
            descent: -350,
            lineGap: 0,
            unitsPerEm: 1000,
            capHeight: 670,
        },
    },
    TitleFont: {
        lineHeight: 62 / 56,
        fontMetrics: {
            ascent: 800,
            descent: -200,
            lineGap: 0,
            unitsPerEm: 1000,
            capHeight: 700,
        },
    },
}

export const FontFamily = Object.fromEntries(Object.keys(fontConfig).map((key) => [key, key])) as {
    [fontName in keyof typeof fontConfig]: fontName
}

type FontFamilySetting = {
    fontFamily: string
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
        targets: ['p', 'ul', 'ol', 'h3', 'h4', 'h5', 'h6'],
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
        ...generatedFontFamilySettings[FontFamily.TitleFont],
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
