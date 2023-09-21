import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const field = style({
    appearance: 'none',
    font: 'inherit',
    color: 'inherit',
    outline: 'none',
    background: 'inherit',
    selectors: {
        '&::placeholder': {
            color: vars.color.foreground.gray2,
        },
    },
})
