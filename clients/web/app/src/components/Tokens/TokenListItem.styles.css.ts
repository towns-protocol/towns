import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const input = style({
    outline: 'none',
    selectors: {
        '&:focus': {
            boxShadow: `inset 0 0 0 1px ${vars.color.foreground.neutral}`,
        },
    },
})
