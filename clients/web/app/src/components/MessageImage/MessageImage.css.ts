import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const containerStyle = style([
    {
        position: 'relative',
        borderRadius: vars.borderRadius.sm,
    },
])
export const buttonStyle = style({
    cursor: 'pointer',
    opacity: 0,
    transition: 'opacity 300ms ease',
    selectors: {
        '&:focus': {
            opacity: 1,
        },
        [`${containerStyle}:hover &`]: {
            display: 'block',
            opacity: 1,
        },
    },
})
