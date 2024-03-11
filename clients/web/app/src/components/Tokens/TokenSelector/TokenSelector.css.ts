import { style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'
import { vars } from 'ui/styles/vars.css'

export const TokenSelectorStyles = style([
    atoms({
        background: 'none',
    }),
    {
        outline: 'none',
        selectors: {
            '&:focus': {
                background: vars.color.background.level3,
            },
        },
    },
])
