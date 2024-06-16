import { globalStyle, style } from '@vanilla-extract/css'
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'
import { boxClass, containerWithGapClass } from 'ui/styles/atoms.css'
import { responsivePropertiesMixin } from 'ui/styles/breakpoints'
import { debugClass } from 'ui/styles/globals/debug.css'
import { vars } from 'ui/styles/vars.css'
import { FontFamily, fontSettings } from 'ui/utils/FontLoader'

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - dynamic properties

const responsiveProperties = defineProperties({
    ...responsivePropertiesMixin,
    properties: {
        fontWeight: vars.fontWeight,
        fontSize: vars.fontSize,
        textAlign: vars.textAlign,
        textTransform: vars.textTransform,
        whiteSpace: vars.whiteSpace,
    },
    shorthands: {
        size: ['fontSize'],
    },
})
const nonResponsiveProperties = defineProperties({
    properties: {
        color: vars.color.foreground,
    },
})

export type TextSprinkles = Parameters<typeof textSprinkles>[0]
export const textSprinkles = createSprinkles(responsiveProperties, nonResponsiveProperties)

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  base properties

/**
 * trim space before and after blocks in order to make spacing consistent.
 * inspiration: https://github.com/seek-oss/capsize
 */

// type FontNames = Array<keyof typeof fontSettings>;

export const fontStyles = fontSettings.reduce((fontStyles, font) => {
    //
    const { capSize } = font

    /* space between lines  */
    const baseProperties = {
        lineHeight: capSize.lineHeight,
    } as const

    const styleBefore = {
        content: '',
        display: 'table',
        textAlign: 'left',
        marginTop: capSize.baselineTrim,
    } as const

    const styleAfter = {
        content: '',
        display: 'table',
        textAlign: 'left',
        marginTop: capSize.capHeightTrim,
    } as const

    /**
     * Apply cap-sized style via vanilla extract
     */
    return [
        ...fontStyles,
        {
            fontFamily: font.fontFamily,
            styleBefore,
            styleAfter,
            baseProperties,
            className: style({
                ...baseProperties,
                selectors: {
                    '&:before': styleBefore,
                    '&:after': styleAfter,
                },
            }),
        },
    ]
}, [] as FontStyle[])

export const bodyFontStyle = fontStyles.find(
    (f) => f.fontFamily === FontFamily.BodyFont,
) as FontStyle

if (!bodyFontStyle) {
    throw new Error('bodyFontStyle not found')
}

type FontStyle = {
    fontFamily: string
    className: string
    baseProperties: { [key: string]: string }
    styleBefore: { content: '' }
    styleAfter: { content: '' }
}

/**
 * Inherit consistent line-spacing for raw HTML inside scoped elements
 */

fontSettings.forEach((font) => {
    const fontStyle = fontStyles.find((f) => f.fontFamily === font.fontFamily)
    if (fontStyle) {
        font.targets.forEach((e) => {
            globalStyle(`${boxClass} ${e}`, {
                fontFamily: [font.fontFamily, font.systemFallback ?? 'sans-serif'].join(', '),
                ...(font.styles ? font.styles : {}),
            })
            globalStyle(`${boxClass} ${e}`, fontStyle.baseProperties)
            globalStyle(`${boxClass} ${e}:before `, fontStyle.styleBefore)
            globalStyle(`${boxClass} ${e}:after `, fontStyle.styleAfter)
        })
    }
})

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - paragraph margin

const siblings = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'ul', 'ol'] as const

siblings.forEach((s) => {
    siblings.forEach((m) =>
        globalStyle(`${boxClass}:not(.${containerWithGapClass}) >  ${s} + ${m}`, {
            marginTop: vars.space.md,
        }),
    )
})

/**
 * Reset top margin for nested blocks
 */
globalStyle(
    `${bodyFontStyle.className} ${bodyFontStyle.className}:before, ${bodyFontStyle.className} ${bodyFontStyle.className}:after`,
    {
        marginTop: 0,
    },
)

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - global text decoration

/**
 * Links
 */
globalStyle(`${bodyFontStyle.className} a`, {
    // color: vars.color.foreground.accent,
})

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - truncated text

/**
 * Handle truncated text
 **/
export const truncateTextStyle = style({
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: '0',
})

/**
 * Since the bounding box is trimmed we need to add some generouse virtual
 * padding in order not get asc/descenders cut-off
 */
export const truncateParentStyle = style({
    overflow: 'hidden',
    padding: '0.5em 0',
    margin: '-0.5em 0',
})

globalStyle(`${bodyFontStyle.className} ${bodyFontStyle.className}:before`, {
    display: 'none',
})
globalStyle(`${bodyFontStyle.className} ${bodyFontStyle.className}:after`, {
    display: 'none',
})

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -debugging

/**
 * Adds  outlines on text element when debug class is present. Explicitely
 * hide debugging for trunccated elements as the "virtual" padding is misleading.
 */
globalStyle(`${debugClass} ${bodyFontStyle.className}:not(${truncateParentStyle})`, {
    boxShadow: '0 0 0 1px #FF09',
})

globalStyle(`${debugClass} p:not(${bodyFontStyle.className})`, {
    // implicit paragraphs declared by inner HTML
    boxShadow: '0 0 0 1px #9F09',
})

globalStyle(`${debugClass} h1:not(${bodyFontStyle.className})`, {
    // implicit paragraphs declared by inner HTML
    boxShadow: '0 0 0 1px #9F09',
})

globalStyle(`${debugClass} h2:not(${bodyFontStyle.className})`, {
    // implicit paragraphs declared by inner HTML
    boxShadow: '0 0 0 1px #9F09',
})
