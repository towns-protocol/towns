import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const buttonTextParent = style({})
export const buttonText = style({
    transition: `opacity 120ms ease`,
    opacity: 0,
    color: vars.color.foreground.gray2,
    background: 'none',
    selectors: {
        [`${buttonTextParent}:hover &`]: {
            opacity: 1,
        },
        '&:hover': {
            color: vars.color.foreground.cta1,
        },
    },
})
