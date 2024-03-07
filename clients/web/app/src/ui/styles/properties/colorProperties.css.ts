import { style } from '@vanilla-extract/css'
import { defineProperties } from '@vanilla-extract/sprinkles'
import { ToneName } from 'ui/styles/themes'
import { darkTheme, lightTheme, vars } from 'ui/styles/vars.css'
import { Figma } from '../palette'

export const hoverableClass = style({
    transition: 'background 120ms ease',
})
export const hoverActiveClass = style({})
export const elevateClass = style({})
export const elevateReadabilityClass = style({})

export const colorProperties = defineProperties({
    conditions: {
        lightMode: {},
        /** instead of using a media-query, we refer to the class set from JS on the
         * root element from within App.tsx */
        darkMode: { selector: `${darkTheme} &` },
        hover: { selector: `&:hover` },
        active: { selector: `&:active` },
        default: { selector: `&` },
    },
    defaultCondition: 'lightMode',
    properties: {
        background: {
            none: {
                background: vars.color.background.none,
            },
            inherit: {
                background: vars.color.background.inherit,
            },
            default: {
                background: vars.color.background.level1,
                vars: {
                    '--background': vars.color.background.level1,
                },
                selectors: {
                    [`${elevateClass} &`]: {
                        background: vars.color.background.level2,
                    },
                    [`${elevateReadabilityClass} &,&${elevateReadabilityClass}`]: {
                        background: vars.color.background.readability,
                        vars: {
                            '--background': vars.color.background.readability,
                            '--background-hover': vars.color.background.readabilityHover,
                        },
                    },
                },
            },
            readability: {
                background: vars.color.background.readability,
            },
            level1: {
                background: vars.color.background.level1,
                vars: {
                    '--background': vars.color.background.level1,
                    '--background-hover': vars.color.background.level1Hover,
                },
                selectors: {
                    [`${elevateReadabilityClass} &,&${elevateReadabilityClass}`]: {
                        background: vars.color.background.readability,
                        vars: {
                            '--background': vars.color.background.readability,
                            '--background-hover': vars.color.background.readabilityHover,
                        },
                    },
                    [`${elevateClass} &`]: {
                        background: vars.color.background.level2,
                        vars: {
                            '--background': vars.color.background.level2,
                            '--background-hover': vars.color.background.level2Hover,
                        },
                    },
                    [`&${hoverableClass}:hover, &${hoverableClass}${hoverActiveClass}`]: {
                        '@media': {
                            '(hover: hover)': {
                                background: 'var(--background-hover)',
                            },
                        },
                    },
                },
            },
            level2: {
                background: vars.color.background.level2,
                color: vars.color.text.gray1,
                vars: {
                    '--background': vars.color.background.level2,
                    '--background-hover': vars.color.background.level2Hover,
                },
                selectors: {
                    [`${elevateClass} &`]: {
                        background: vars.color.background.level3,
                        color: vars.color.text.gray1,
                        vars: {
                            '--background': vars.color.background.level3,
                            '--background-hover': vars.color.background.level3Hover,
                        },
                    },
                    [`&${hoverableClass}:hover,&${hoverableClass}${hoverActiveClass}`]: {
                        '@media': {
                            '(hover: hover)': {
                                background: 'var(--background-hover)',
                            },
                        },
                    },
                },
            },
            level3: {
                background: vars.color.background.level3,
                color: vars.color.text.gray1,
                vars: {
                    '--background': vars.color.background.level3,
                    '--background-hover': vars.color.background.level3Hover,
                },

                selectors: {
                    [`${elevateClass} &`]: {
                        background: vars.color.background.level4,
                        color: vars.color.text.gray1,
                        vars: {
                            '--background': vars.color.background.level4,
                            '--background-hover': vars.color.background.level4Hover,
                        },
                    },
                    [`&${hoverableClass}:hover, &${hoverableClass}${hoverActiveClass}`]: {
                        '@media': {
                            '(hover: hover)': {
                                background: 'var(--background-hover)',
                            },
                        },
                    },
                },
            },
            level4: {
                background: vars.color.background.level4,
                color: vars.color.text.gray1,
                vars: {
                    '--background': vars.color.background.level4,
                    '--background-hover': vars.color.background.level4Hover,
                },
                selectors: {
                    [`&${hoverableClass}:hover, &${hoverableClass}${hoverActiveClass}`]: {
                        '@media': {
                            '(hover: hover)': {
                                background: 'var(--background-hover)',
                            },
                        },
                    },
                },
            },

            backdropBlur: {
                vars: {
                    '--bg-opacity': '0.5',
                },
                WebkitBackdropFilter: 'blur(10px)',
                backdropFilter: 'blur(10px)',
                selectors: {
                    [`${darkTheme} &`]: {
                        background: Figma.DarkMode.Level1Transparent,
                        color: vars.color.overlay.black,
                        vars: {
                            '--background': Figma.DarkMode.Level1Transparent,
                        },
                    },
                    [`${lightTheme} &`]: {
                        background: Figma.LightMode.Level1Transparent,
                        color: vars.color.overlay.black,
                        vars: {
                            '--background': Figma.LightMode.Level1Transparent,
                        },
                    },
                },
            },
            hover: {
                background: vars.color.background.hover,
                vars: {
                    '--background': vars.color.background.hover,
                },
            },
            lightHover: {
                background: vars.color.background.lightHover,
                vars: {
                    '--background': vars.color.background.lightHover,
                },
            },
            inverted: {
                background: vars.color.background.inverted,
                color: vars.color.text.inverted,
                vars: {
                    '--background': vars.color.background.inverted,
                },
            },
            [ToneName.Accent]: {
                background: vars.color.tone.accent,
                color: vars.color.text.inverted,
                vars: {
                    '--background': vars.color.tone.accent,
                },
            },
            [ToneName.AccentTransparent]: {
                background: vars.color.tone.accentTransparent,
                color: vars.color.text.default,
                vars: {
                    '--background': vars.color.tone.accentTransparent,
                },
            },
            [ToneName.CTA1]: {
                background: `linear-gradient(90deg, #21E078 0%, #1FDBF1 100%);`,
                color: vars.color.text.onTone,
                vars: {
                    '--background': `linear-gradient(90deg, #21E078 0%, #1FDBF1 100%);`,
                },
            },
            [ToneName.CTA2]: {
                background: vars.color.tone.cta2,
                color: vars.color.text.onTone,
                vars: {
                    '--background': vars.color.tone.cta2,
                },
            },
            /** form semantic - positive feedback, valid etc. */
            [ToneName.Positive]: {
                background: vars.color.tone.positive,
                color: vars.color.text.onTone,
                vars: {
                    '--background': vars.color.tone.positive,
                },
            },
            /** form semantic - negative feedback, error msg. etc. */
            [ToneName.Negative]: {
                background: vars.color.tone.negative,
                color: vars.color.text.onTone,
                vars: {
                    '--background': vars.color.tone.negative,
                },
            },
            /** form semantic - neutral  */
            [ToneName.Neutral]: {
                background: undefined,
                color: undefined,
            },

            [ToneName.Error]: {
                background: vars.color.tone.negative,
                color: vars.color.text.default,
                vars: {
                    '--background': vars.color.tone.negative,
                },
            },
        },
        color: {
            ...vars.color.foreground,
            default: {
                color: vars.color.foreground.default,
                selectors: {
                    // needed to override the default color when the level is "elevated"
                    [`${elevateClass} &`]: {
                        color: vars.color.foreground.default,
                    },
                },
            },
            ...{
                level1: {
                    color: vars.color.background.level1,
                    selectors: {
                        [`${elevateClass} &`]: {
                            color: vars.color.background.level2,
                        },
                    },
                },
                level2: {
                    color: vars.color.background.level2,
                    selectors: {
                        [`${elevateClass} &`]: {
                            color: vars.color.background.level3,
                        },
                    },
                },
                level3: {
                    color: vars.color.background.level3,
                    selectors: {
                        [`${elevateClass} &`]: {
                            color: vars.color.background.level4,
                        },
                    },
                },
                level4: {
                    color: vars.color.background.level4,
                },
            },
        },
    },
})
