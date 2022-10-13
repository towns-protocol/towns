import { defineProperties } from '@vanilla-extract/sprinkles'
import { vars } from 'ui/styles/vars.css'
import { responsivePropertiesMixin } from 'ui/styles/breakpoints'

export const border = {
    none: `none`,
    default: `1px solid ${vars.color.background.level3}`,
    accent: `1px solid ${vars.color.background.etherum}`,
    strong: `2px solid ${vars.color.text.default}`,
    inverted: `1px solid ${vars.color.text.inverted}`,
} as const

export const aspectRatio = {
    square: '1',
    '1/1': '1',
    '4/3': '4 / 3',
    '3/4': '3 / 4',
    '16/9': '16 / 9',
    '9/16': '9 / 16',
    '2/1': '2 / 1',
    '1/2': '1 / 2',
    '3/1': '3 / 1',
    '1/3': '1 / 3',
}

export const flexDirection = {
    row: 'row',
    column: 'column',
} as const

export const flexAlignment = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
} as const

export const flexJustifyAlignment = {
    ...flexAlignment,
    spaceAround: 'space-around',
    spaceBetween: 'space-between',
} as const

export const flexGrow = {
    h1: 0.1,
    h2: 0.2,
    h3: 0.3,
    h4: 0.4,
    h5: 0.5,
    h6: 0.6,
    h7: 0.7,
    h8: 0.8,
    h9: 0.9,
    x0: 0,
    x1: 1,
    x2: 2,
    x3: 3,
    x4: 4,
    x5: 5,
    x6: 6,
    x7: 7,
    x8: 8,
    x9: 9,
} as const

export const boxProperties = defineProperties({
    ...responsivePropertiesMixin,
    properties: {
        // display
        display: [
            'block',
            'flex',
            'grid',
            'inline-block',
            'inline-flex',
            'inline',
            'none',
            'contents',
        ],

        pointerEvents: ['all', 'auto', 'none'],

        // size
        aspectRatio: aspectRatio,
        boxShadow: {
            avatar: `0 4px 4px ${vars.color.shadow.medium}`,
            card: `0 0 40px ${vars.color.shadow.light}`,
        },

        height: {
            ...vars.dims.baseline,
            ...vars.dims.height,
            ...vars.dims.input,
            ...vars.dims.screen,
        },
        minHeight: {
            ...vars.dims.baseline,
            ...vars.dims.height,
            ...vars.dims.input,
            ...vars.dims.screen,
        },
        maxHeight: {
            ...vars.dims.baseline,
            ...vars.dims.height,
            ...vars.dims.input,
            ...vars.dims.screen,
        },
        width: { ...vars.dims.baseline, ...vars.dims.height, ...vars.dims.screen },
        minWidth: {
            ...vars.dims.baseline,
            ...vars.dims.height,
            ...vars.dims.screen,
        },
        maxWidth: {
            ...vars.dims.baseline,
            ...vars.dims.height,
            ...vars.dims.screen,
        },

        square: {
            square_xxs: {
                height: vars.dims.square.square_xxs,
                width: vars.dims.square.square_xxs,
            },
            square_xs: {
                height: vars.dims.square.square_xs,
                width: vars.dims.square.square_xs,
            },
            square_sm: {
                height: vars.dims.square.square_sm,
                width: vars.dims.square.square_sm,
            },
            square_md: {
                height: vars.dims.square.square_md,
                width: vars.dims.square.square_md,
            },
            square_lg: {
                height: vars.dims.square.square_lg,
                width: vars.dims.square.square_lg,
            },
            square_xl: {
                height: vars.dims.square.square_xl,
                width: vars.dims.square.square_xl,
            },
            square_xxl: {
                height: vars.dims.square.square_xxl,
                width: vars.dims.square.square_xxl,
            },
            square_inline: {
                height: vars.dims.square.square_inline,
                width: vars.dims.square.square_inline,
            },
        },

        // padding
        paddingLeft: vars.space,
        paddingRight: vars.space,
        paddingTop: vars.space,
        paddingBottom: vars.space,

        // padding
        insetLeft: vars.insetLeft,
        insetRight: vars.insetRight,
        insetTop: vars.insetTop,
        insetBottom: vars.insetBottom,

        // border
        borderLeft: border,
        borderRight: border,
        borderTop: border,
        borderBottom: border,
        borderRadius: vars.borderRadius,
        borderTopLeftRadius: vars.borderRadius,
        borderTopRightRadius: vars.borderRadius,
        borderBottomLeftRadius: vars.borderRadius,
        borderBottomRightRadius: vars.borderRadius,

        // flex
        flexDirection: flexDirection,
        gap: vars.space,
        flexWrap: ['wrap', 'nowrap'],
        flexGrow: flexGrow,
        flexShrink: flexGrow,
        flexBasis: { ...vars.dims.height, ...vars.dims.screen },
        alignContent: { ...flexAlignment, baseline: 'baseline' },
        alignItems: { ...flexAlignment, baseline: 'baseline' },
        alignSelf: { ...flexAlignment, baseline: 'baseline' },
        justifyContent: flexJustifyAlignment,
        justifySelf: flexAlignment,
        zIndex: vars.zIndex,
    },

    shorthands: {
        basis: ['flexBasis'],
        direction: ['flexDirection'],
        inset: ['insetLeft', 'insetRight', 'insetTop', 'insetBottom'],
        insetX: ['insetLeft', 'insetRight'],
        insetY: ['insetTop', 'insetBottom'],
        paddingX: ['paddingLeft', 'paddingRight'],
        paddingY: ['paddingTop', 'paddingBottom'],
        padding: ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'],

        border: ['borderLeft', 'borderRight', 'borderTop', 'borderBottom'],
        rounded: [
            'borderTopLeftRadius',
            'borderTopRightRadius',
            'borderBottomLeftRadius',
            'borderBottomRightRadius',
        ],
        roundedTop: ['borderTopLeftRadius', 'borderTopRightRadius'],
        roundedBottom: ['borderBottomLeftRadius', 'borderBottomRightRadius'],
        roundedRight: ['borderTopRightRadius', 'borderBottomRightRadius'],
        roundedLeft: ['borderTopLeftRadius', 'borderBottomLeftRadius'],
    },
})
