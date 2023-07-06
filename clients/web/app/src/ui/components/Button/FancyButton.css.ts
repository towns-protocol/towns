import { keyframes, style } from '@vanilla-extract/css'

const animation = keyframes({
    '0%': { backgroundSize: '100%', opacity: 0 },
    '10%': { backgroundSize: '100%', opacity: 0.2 },
    '100%': { backgroundSize: '400%', opacity: 0 },
})

export const ripple = style({
    opacity: 0,
    mixBlendMode: 'multiply',
    animationFillMode: 'forwards',
    animationName: animation,
    animationTimingFunction: 'ease-out',
    animationDuration: '0.6s',
    animationIterationCount: 1,
    backgroundImage: `radial-gradient(circle at var(--center), #000 0% , #000 10%, #fff 15%, #999 25%)`,
})
