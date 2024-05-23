import {
    assignVars,
    createGlobalTheme,
    createThemeContract,
    createVar,
    globalStyle,
    style,
} from '@vanilla-extract/css'
import { breakpoints } from './breakpoints'
import { themes } from './themes'

// export const zoom = 1.1;
export const baseline = 8 as const

const colorContract = createThemeContract(themes.light)

export const lightTheme = style({})
export const darkTheme = style({})

export const globalPreventTransitions = style({})
globalStyle(`${globalPreventTransitions} *`, {
    transition: 'none!important',
})

export const zLayerVar = createVar()
export const zIndexVar = createVar()

const responsiveMeasurements = {
    mobileFonts: {
        fontSize: {
            xs: `${12}px`,
            sm: `${15}px`,
            mds: `${16}px`,
            md: `${17}px`,
            lg: `${20}px`,
            display: `${120}px`,

            h1: `${32}px`,
            h2: `${21}px`,
            h3: `${21}px`,
            h4: `${17}px`,
        } as const,
    },

    desktopFonts: {
        fontSize: {
            xs: `${11}px`,
            sm: `${14}px`,
            mds: `${15}px`,
            md: `${16}px`,
            lg: `${18}px`,
            display: `${120}px`,
            h1: `${56}px`,
            h2: `${32}px`,
            h3: `${18}px`,
            h4: `${15}px`,
        } as const,
    } as const,
} as const

export const fontContract = createThemeContract(responsiveMeasurements.desktopFonts)

globalStyle(':root', {
    vars: assignVars(fontContract, responsiveMeasurements.mobileFonts),
    '@media': {
        '(min-width: 720px)': {
            vars: assignVars(fontContract, responsiveMeasurements.desktopFonts),
        },
    },
})

globalStyle(`:root:not(${darkTheme})`, {
    '@media': {
        '(prefers-color-scheme: light)': {
            vars: assignVars(colorContract, themes.light),
        },
    },
})
globalStyle(`:root:not(${lightTheme})`, {
    '@media': {
        '(prefers-color-scheme: dark)': {
            vars: assignVars(colorContract, themes.dark),
        },
    },
})

globalStyle(darkTheme, {
    vars: assignVars(colorContract, themes.dark),
})
globalStyle(lightTheme, {
    vars: assignVars(colorContract, themes.light),
})

const root = createGlobalTheme(':root', {
    bl: `${baseline}px`,

    space: {
        none: '0',
        xxs: `${baseline * 0.25}px`,
        // 11 occurences
        xs: `${baseline * 0.5}px`,
        // 45 occurences
        sm: `${baseline * 1}px`, // sm
        // 67 occurences
        md: `${baseline * 2}px`, // md
        // 15 occurences
        lg: `${baseline * 3}px`, // lg

        x4: `${baseline * 4}px`, // old lg

        x8: `${baseline * 8}px`,
        x16: `${baseline * 16}px`,
        x18: `${baseline * 18}px`,
        x20: `${baseline * 20}px`,
        // suited for text spacing
        paragraph: `${baseline * 1.5}px`, // m
        line: `${baseline * 0.75}px`,

        safeAreaInsetTop: 'env(safe-area-inset-top)',
        safeAreaInsetBottom: 'env(safe-area-inset-bottom)',
        '-xs': `${baseline * -0.5}px`,
        '-sm': `${baseline * -1}px`,
        '-md': `${baseline * -2}px`,
        '-lg': `${baseline * -3}px`,
        '-x4': `${baseline * -4}px`,
        '-x8': `${baseline * -8}px`,
    } as const,

    dims: {
        square: {
            // 12px - pins
            square_xxs: `${baseline * 1.5}px`,
            // xsmall icons / avatars
            square_xs: `${baseline * 2}px`, // 16
            // small icons / avatars
            square_sm: `${baseline * 2.5}px`, // 20
            // default icon
            square_md: `${baseline * 3}px`, // 24
            // default icon
            square_lg: `${baseline * 4}px`,
            // big icons
            square_xl: `${baseline * 8}px`, // 64
            // hero avatar
            square_xxl: `${baseline * 10}px`,

            square_inline: `1.5em`,
        },
        height: {
            /** text */
            height_sm: `${baseline * 1.5}px`,
            /** pills */
            height_md: `${baseline * 3.5}px`,
            /** message rows */
            height_lg: `${baseline * 5}px`,
            /** top bar */
            height_xl: `${baseline * 6.5}px`,
        },

        baseline: {
            /**
             * ideally we would only use semantical but small inconsistencies makes it
             * hard to to make one-version-fits-all-needs
             **/
            x1: `${baseline * 1}px`,
            x2: `${baseline * 2}px`,
            x3: `${baseline * 3}px`,
            x4: `${baseline * 4}px`,
            x5: `${baseline * 5}px`,
            x6: `${baseline * 6}px`,
            x7: `${baseline * 7}px`,
            x8: `${baseline * 8}px`,
            x9: `${baseline * 9}px`,

            /** 80px */
            x10: `${baseline * 10}px`,
            x11: `${baseline * 11}px`,
            x12: `${baseline * 12}px`,
            /** 120px */
            x15: `${baseline * 15}px`,
            x16: `${baseline * 16}px`,
            x17: `${baseline * 17}px`,
            x18: `${baseline * 18}px`,
            /** 160px */
            x20: `${baseline * 20}px`,
            /** 320px */
            x40: `${baseline * 40}px`,
        },

        screen: {
            none: '0',
            auto: 'auto',
            // for testing !
            'min-content': `min-content`,
            'max-content': `max-content`,
            'fit-content': `fit-content`,
            '5vw': `5vw`,
            '10vw': `10vw`,
            '25vw': `25vw`,
            '50vw': `50vw`,
            '75vw': `75vw`,
            '90vw': `90vw`,
            '10vh': `10vh`,
            '25vh': `25vh`,
            '50vh': `50vh`,
            '75vh': `75vh`,
            '100vw': `100vw`,
            '100vh': `100vh`,
            '100dvh': `100dvh`,
            '100svh': `100svh`,
            '100lvh': `100lvh`,
            '25%': `25%`,
            '50%': `50%`,
            '75%': `75%`,
            '100%': `100%`,
            '1': '1px',
            '2': '2px',
            paragraph: '12px',
            '100': `100px`,
            '150': `150px`,
            '200': `200px`,
            '250': `250px`,
            '300': `300px`,
            '350': `350px`,
            '400': `400px`,
            '420': `420px`,
            '500': `500px`,
            '600': `600px`,
            '700': `700px`,
            '800': `800px`,
            '900': `900px`,
            '1000': `1000px`,
            '1200': `1200px`,
            forceScroll: '101%',
            tablet: `${breakpoints.tablet}px`,
            // desktop: `${breakpoints.desktop}px`,
            wide: `${breakpoints.wide}px`,
        },

        toolbar: {
            toolbar_icon: `${baseline * 3}px`,
        },

        input: {
            input_sm: `${baseline * 3}px`,
            // drop downs
            input_md: `${baseline * 5}px`,
            // chat input
            input_lg: `${baseline * 6}px`,
            // chat input
            input_xl: `${baseline * 8}px`,
        },
        button: {
            button_xs: `${baseline * 3}px`,
            button_sm: `${baseline * 4}px`,
            button_md: `${baseline * 6}px`,
            button_lg: `${baseline * 8}px`,
        },
    } as const,

    insetLeft: {
        none: { marginLeft: '0' },
        xxs: {
            marginLeft: `${baseline * -0.5}px`,
        },
        xs: { marginLeft: `${baseline * -1}px` },
        sm: { marginLeft: `${baseline * -2}px` },
        md: { marginLeft: `${baseline * -4}px` },
        lg: { marginLeft: `${baseline * -8}px` },
        xl: {
            marginLeft: `${baseline * -16}px`,
        },
    } as const,

    insetRight: {
        none: { marginRight: '0' },
        xxs: {
            marginRight: `${baseline * -0.5}px`,
        },
        xs: { marginRight: `${baseline * -1}px` },
        sm: { marginRight: `${baseline * -2}px` },
        md: { marginRight: `${baseline * -4}px` },
        lg: { marginRight: `${baseline * -8}px` },
        xl: {
            marginRight: `${baseline * -16}px`,
        },
    } as const,

    insetTop: {
        none: { marginTop: '0' },
        '2': {
            marginTop: `${baseline * -0.25}px`,
        },
        xxs: {
            marginTop: `${baseline * -0.5}px`,
        },
        xs: { marginTop: `${baseline * -1}px` },
        sm: { marginTop: `${baseline * -2}px` },
        md: { marginTop: `${baseline * -4}px` },
        lg: { marginTop: `${baseline * -8}px` },
        xl: {
            marginTop: `${baseline * -16}px`,
        },
        safeArea: { marginTop: 'env(safe-area-inset-top)' },
    } as const,

    insetBottom: {
        none: { marginBottom: '0' },
        xxs: {
            marginBottom: `${baseline * -0.5}px`,
        },
        xs: { marginBottom: `${baseline * -1}px` },
        sm: { marginBottom: `${baseline * -2}px` },
        md: { marginBottom: `${baseline * -4}px` },
        lg: { marginBottom: `${baseline * -8}px` },
        xl: {
            marginBottom: `${baseline * -16}px`,
        },
        safeArea: { marginBottom: 'env(safe-area-inset-bottom)' },
    } as const,

    borderRadius: {
        none: '0',
        xs: `${baseline * 0.5}px`,
        sm: `${baseline * 1}px`,
        md: `${baseline * 2}px`,
        lg: `${baseline * 4}px`,
        xl: `${baseline * 8}px`,
        full: '999999px',
    } as const,

    fontWeight: {
        normal: {
            fontVariationSettings: '"wdth" 100, "wght" 400, "ital" 0',
        },
        medium: {
            fontVariationSettings: '"wdth" 100, "wght" 500, "ital" 0',
        },
        strong: {
            fontVariationSettings: '"wdth" 100, "wght" 700, "ital" 0',
        },
    } as const,

    textAlign: {
        left: 'left',
        right: 'right',
        center: 'center',
        justify: 'justify',
    } as const,

    textDecoration: {
        lineThrough: 'line-through',
        overline: 'overline',
        underline: 'underline',
        none: 'normal',
    } as const,

    textTransform: {
        lowercase: 'lowercase',
        uppercase: 'uppercase',
        capitalize: 'capitalize',
        none: 'normal',
    } as const,

    whiteSpace: {
        normal: 'normal',
        nowrap: 'nowrap',
        pre: 'pre',
        preLine: 'pre-line',
        preWrap: 'pre-wrap',
    } as const,

    colSpan: {
        1: `span 1`,
        2: `span 2`,
        3: `span 3`,
        4: `span 4`,
        5: `span 5`,
        6: `span 6`,
        7: `span 7`,
        8: `span 8`,
        9: `span 9`,
        10: `span 10`,
        11: `span 11`,
        12: `span 12`,
    } as const,

    zIndex: {
        layer: {
            vars: {
                [zIndexVar]: `0`,
            },
        },
        above: {
            vars: {
                [zIndexVar]: `5`,
            },
        },
        below: {
            vars: {
                [zIndexVar]: `-1`,
            },
        },
        ui: {
            vars: {
                [zIndexVar]: `10`,
            },
        },
        uiAbove: {
            vars: {
                [zIndexVar]: `11`,
            },
        },
        tooltips: {
            vars: {
                [zIndexVar]: `20`,
            },
        },
        tooltipsAbove: {
            vars: {
                [zIndexVar]: `21`,
            },
        },
        debug: {
            vars: {
                [zLayerVar]: `100`,
                [zIndexVar]: `1`,
            },
        },
    } as const,
})

export const vars = {
    ...root,
    ...fontContract,
    color: colorContract,
}
