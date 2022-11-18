import { style } from '@vanilla-extract/css'
import { atoms } from 'ui/styles/atoms.css'

export const Dot = style([
    atoms({
        width: 'x1',
        height: 'x1',
        rounded: 'full',
        background: 'negative',
        position: 'bottomRight',
    }),
    {
        transform: `translate(25%,25%)`,
    },
])
