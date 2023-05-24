import { style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'
import { vars } from 'ui/styles/vars.css'

export const Dot = style([
    atoms({
        width: 'x1',
        height: 'x1',
        rounded: 'full',
        background: 'accent',
        position: 'bottomRight',
    }),
    {
        transform: `translate(25%,25%)`,
        boxShadow: `0 0 0 2px ${vars.color.background.level1}`,
    },
])
