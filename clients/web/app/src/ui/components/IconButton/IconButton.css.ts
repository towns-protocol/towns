import { style, styleVariants } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

const base = style({
    cursor: 'pointer',
})

export const iconButton = styleVariants({
    default: [
        base,
        {
            ':hover': {
                color: vars.color.foreground.default,
            },
        },
    ],
    cta1: [
        base,
        {
            ':hover': {
                color: vars.color.background.cta1,
            },
        },
    ],
    error: [
        base,
        {
            ':hover': {
                color: vars.color.background.error,
                opacity: 0.8,
            },
        },
    ],
})
