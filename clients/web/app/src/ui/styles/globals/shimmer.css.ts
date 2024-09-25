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
    animation: `${shimmerKeyframes} 5s infinite ease-in`,
    background: `linear-gradient(
       to right, ${vars.color.background.level2} 0px, ${vars.color.background.level2Hover} 300px, ${vars.color.background.level2} 1000px
    )`,
    backgroundSize: `3000px 100%`,
})

const pillShimmerKeyframes = keyframes({
    '0%': {
        backgroundPosition: `-200px 0`,
    },
    '20%': {
        backgroundPosition: `0px 0`,
    },
    '100%': {
        backgroundPosition: `200px 0`,
    },
})

export const pillShimmerClass = style({
    animation: `${pillShimmerKeyframes} 2s infinite ease-in`,
    background: `linear-gradient(
       to right, ${vars.color.background.level3} 0px, ${vars.color.background.level3Hover} 200px, ${vars.color.background.level3} 400px
    )`,
    backgroundSize: `400px 100%`,
})

export const shimmerGradientTopClass = style({
    selectors: {
        '&:after': {
            content: ``,
            position: `absolute`,
            inset: 0,
            height: `200px`,
            background: `linear-gradient(180deg, ${vars.color.background.level1} 0%, transparent 100%)`,
        },
    },
})
