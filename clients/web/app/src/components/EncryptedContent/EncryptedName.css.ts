import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

export const main = style({})

export const hoverBackground = style({
    transition: 'background 320ms',
    selectors: {
        [`${main}:hover &`]: {
            background: vars.color.background.level3Hover,
        },
    },
})

export const hoverColor = style({
    transition: 'color 320ms',
    selectors: {
        [`${main}:hover &`]: {
            color: vars.color.background.level3Hover,
        },
    },
})
