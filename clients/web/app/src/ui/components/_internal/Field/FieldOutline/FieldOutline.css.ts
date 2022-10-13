import { createVar, style, styleVariants } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'
import { field } from '../Field.css'

const focusedOpacityVar = createVar()
const focusedColorVar = createVar()

export const fieldOutline = style({
    vars: {
        [focusedOpacityVar]: '1',
        [focusedColorVar]: vars.color.foreground.etherum,
    },
    transition: `opacity 120ms ease`,
    boxShadow: `inset 0 0 0 1px ${focusedColorVar}`,

    selectors: {
        [`${field} ~ &`]: {
            opacity: 0,
            boxShadow: `0 0 0 2px ${focusedColorVar}`,
        },
        [`${field}:focus ~ &, ${field}.focused ~ &`]: {
            opacity: focusedOpacityVar,
            boxShadow: `0 0 0 2px ${focusedColorVar}`,
        },
        [`${field}:focus-visible ~ &, ${field}.focus-visible ~ &`]: {
            opacity: focusedOpacityVar,
            boxShadow: `0 0 0 2px ${focusedColorVar}`,
        },
        // [`${field}:hover:not(:disabled) ~ &, ${field}:focus ~ &, ${field}.focused ~ &`]:
        //   {
        //     opacity: focusedOpacityVar,
        //     boxShadow: `0 0 0 2px ${focusedColorVar}`,
        //   },
    },
})

export const fieldTones = styleVariants({
    neutral: {
        opacity: 0,
        vars: {
            [focusedOpacityVar]: '1',
            [focusedColorVar]: vars.color.foreground.etherum,
        },
    },
    negative: {
        opacity: 1,
        vars: {
            [focusedOpacityVar]: '1',
            [focusedColorVar]: vars.color.foreground.negative,
        },
    },
    positive: {
        opacity: 1,
        vars: {
            [focusedOpacityVar]: '1',
            [focusedColorVar]: vars.color.foreground.positive,
        },
    },
    etherum: {
        vars: {
            [focusedOpacityVar]: '1',
            [focusedColorVar]: vars.color.foreground.etherum,
        },
    },
})
