import { keyframes, style } from '@vanilla-extract/css'

const animation = keyframes({
    '0%': { left: '-100%' },
    '100%': { left: '100%' },
})

export const animatedGradient = style({
    height: '100%',
    width: '100%',
    position: 'absolute',
    animationName: animation,
    animationDuration: '2.5s',
    animationIterationCount: 'infinite',
    animationFillMode: 'forwards',
    background:
        'linear-gradient(90deg, #21E07800 0%, #21E078 20%, #1FDBF1 38.6%, #1B1A1F 80%, #1B1A1F00 100%)',
})
