import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const buttonText = style({
    transition: `all 120ms ease`,
    selectors: {
        '&:hover': {
            color: vars.color.foreground.cta1,
        },
    },
})
