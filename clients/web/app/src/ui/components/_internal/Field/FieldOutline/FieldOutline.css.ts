import { createVar, style, styleVariants } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'
import { field } from '../Field.css'

const focusedOpacityVar = createVar()
const focusedColorVar = createVar()

export const fieldOutline = style({
    vars: {
        [focusedOpacityVar]: '1',
        [focusedColorVar]: vars.color.foreground.accent,
    },
    transition: `opacity 120ms ease`,
    boxShadow: `inset 0 0 0 1px ${focusedColorVar}`,

    selectors: {
        [`${field} ~ &`]: {
            opacity: 0,
            boxShadow: `0 0 0 1px ${focusedColorVar}`,
        },
        [`${field}:focus ~ &, ${field}.focused ~ &`]: {
            opacity: focusedOpacityVar,
            boxShadow: `0 0 0 1px ${focusedColorVar}`,
        },
        [`${field}:focus-visible ~ &, ${field}.focus-visible ~ &`]: {
            opacity: focusedOpacityVar,
            boxShadow: `0 0 0 1px ${focusedColorVar}`,
        },
        // [`${field}:hover:not(:disabled) ~ &, ${field}:focus ~ &, ${field}.focused ~ &`]:
        //   {
        //     opacity: focusedOpacityVar,
        //     boxShadow: `0 0 0 1px ${focusedColorVar}`,
        //   },
    },
})

export const fieldTones = styleVariants({
    neutral: {
        opacity: 0,
        vars: {
            [focusedOpacityVar]: '0.33',
            [focusedColorVar]: vars.color.foreground.neutral,
        },
    },
    negative: {
        opacity: 1,
        vars: {
            [focusedOpacityVar]: '1',
            [focusedColorVar]: vars.color.foreground.negative,
        },
    },
    error: {
        opacity: 1,
        vars: {
            [focusedOpacityVar]: '1',
            [focusedColorVar]: vars.color.foreground.error,
        },
    },
    positive: {
        opacity: 1,
        vars: {
            [focusedOpacityVar]: '1',
            [focusedColorVar]: vars.color.foreground.accent,
        },
    },
    accent: {
        opacity: 1,
        vars: {
            [focusedOpacityVar]: '1',
            [focusedColorVar]: vars.color.foreground.accent,
        },
    },
    none: {
        opacity: 1,
        vars: {
            [focusedOpacityVar]: '0',
            [focusedColorVar]: vars.color.foreground.accent,
        },
    },
})
