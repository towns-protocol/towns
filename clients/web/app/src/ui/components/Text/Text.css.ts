import { globalStyle, style } from '@vanilla-extract/css'
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'
import { boxClass, containerWithGapClass } from 'ui/styles/atoms.css'
import { debugClass } from 'ui/styles/globals/debug.css'
import { vars } from 'ui/styles/vars.css'
import { fontSettings } from 'ui/utils/FontLoader'

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - dynamic properties

const nonResponsiveProperties = defineProperties({
    properties: {
        color: vars.color.foreground,
        fontVariationSettings: vars.fontVariationSettings,
        fontWeight: vars.fontWeight,
        fontSize: vars.fontSize,
        textAlign: vars.textAlign,
        textTransform: vars.textTransform,
    },
    shorthands: {
        size: ['fontSize'],
    },
})

export type TextSprinkles = Parameters<typeof textSprinkles>[0]
export const textSprinkles = createSprinkles(nonResponsiveProperties)

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
        marginTop: capSize.trimTop,
    } as const

    const styleAfter = {
        content: '',
        display: 'table',
        textAlign: 'left',
        marginTop: capSize.trimBottom,
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
                fontFamily: font.fontFamily,
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
    `${fontStyles[0].className} ${fontStyles[0].className}:before, ${fontStyles[0].className} ${fontStyles[0].className}:after`,
    {
        marginTop: 0,
    },
)

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - global text decoration

/**
 * Links
 */
globalStyle(`${fontStyles[0].className} a`, {
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

//  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -debugging

/**
 * Adds  outlines on text element when debug class is present. Explicitely
 * hide debugging for trunccated elements as the "virtual" padding is misleading.
 */
globalStyle(`${debugClass} ${fontStyles[0].className}:not(${truncateParentStyle})`, {
    boxShadow: '0 0 0 1px #FF09',
})
globalStyle(`${debugClass} p:not(${fontStyles[0].className})`, {
    // implicit paragraphs declared by inner HTML
    boxShadow: '0 0 0 1px #9F09',
})

globalStyle(`${debugClass} h1:not(${fontStyles[0].className})`, {
    // implicit paragraphs declared by inner HTML
    boxShadow: '0 0 0 1px #9F09',
})

globalStyle(`${debugClass} h2:not(${fontStyles[0].className})`, {
    // implicit paragraphs declared by inner HTML
    boxShadow: '0 0 0 1px #9F09',
})
