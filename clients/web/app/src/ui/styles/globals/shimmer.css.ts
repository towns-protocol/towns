import { keyframes, style } from '@vanilla-extract/css'
import { vars } from '../vars.css'

const shimmerKeyframes = keyframes({
    '0%': {
        backgroundPosition: `-1000px 0`,
    },
    '20%': {
        backgroundPosition: `500px 0`,
    },
    '100%': {
        backgroundPosition: `1000px 0`,
    },
})

export const shimmerClass = style({
    animation: `${shimmerKeyframes} 2s infinite ease-in`,
    background: `linear-gradient(
       to right, ${vars.color.background.level2} 0px, ${vars.color.background.level3} 300px, ${vars.color.background.level2} 1000px
    )`,
    backgroundSize: `3000px 100%`,
})
