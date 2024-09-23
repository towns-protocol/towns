import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const field = style({
    appearance: 'none',
    color: 'inherit',
    outline: 'none',
    background: 'none',
    selectors: {
        '&::placeholder': {
            color: vars.color.foreground.gray2,
        },
    },
})
