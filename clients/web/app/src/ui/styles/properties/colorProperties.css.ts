import { defineProperties } from '@vanilla-extract/sprinkles'
import { ToneName } from 'ui/styles/themes'
import { darkTheme, vars } from 'ui/styles/vars.css'

const background = {
    none: {
        background: vars.color.background.none,
    },
    inherit: {
        background: vars.color.background.inherit,
    },
    default: {
        background: vars.color.background.level1,
    },
    level1: {
        background: vars.color.background.level1,
    },
    level2: {
        background: vars.color.background.level2,
        color: vars.color.text.gray1,
    },
    level3: {
        background: vars.color.background.level3,
        color: vars.color.text.gray1,
    },
    level4: {
        background: vars.color.background.level4,
        color: vars.color.text.gray1,
    },
    transparentBright: {
        background: vars.color.overlay.transparentBright,
        color: vars.color.overlay.black,
    },
    transparentDark: {
        background: vars.color.overlay.transparentDark,
        color: vars.color.overlay.white,
    },
    inverted: {
        background: vars.color.background.inverted,
        color: vars.color.text.inverted,
    },
    /** html semantic - links and highlights */
    [ToneName.Accent]: {
        background: vars.color.tone.accent,
        color: vars.color.text.onTone,
    },
    [ToneName.CTA1]: {
        background: `linear-gradient(91.2deg, #21E078 0%, #1FDBF1 101.62%);`,
        color: vars.color.text.onTone,
    },
    [ToneName.CTA2]: {
        background: vars.color.tone.cta2,
        color: vars.color.text.onTone,
    },
    /** form semantic - positive feedback, valid etc. */
    [ToneName.Positive]: {
        background: vars.color.tone.positive,
        color: vars.color.text.onTone,
    },
    /** form semantic - negative feedback, error msg. etc. */
    [ToneName.Negative]: {
        background: vars.color.tone.negative,
        color: vars.color.text.onTone,
    },
    /** form semantic - neutral  */
    [ToneName.Neutral]: {
        background: undefined,
        color: undefined,
    },
    [ToneName.ENS]: {
        background: vars.color.tone.etherum,
        color: vars.color.text.onTone,
    },
    [ToneName.Error]: {
        background: vars.color.tone.error,
        color: vars.color.text.onTone,
    },
} as const

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
        background,
        color: vars.color.foreground,
    },
})
