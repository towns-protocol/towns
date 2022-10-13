import { keyframes, style } from '@vanilla-extract/css'

export const Spinner = style({
    position: 'relative',
})

export const keyframesRotate = keyframes({
    '100%': {
        transform: 'rotate(360deg)',
    },
})

export const keyframesDash = keyframes({
    '0%': {
        strokeDasharray: '1, 200',
        strokeDashoffset: '0',
    },
    '50%': {
        strokeDasharray: '89, 200',
        strokeDashoffset: '-35px',
    },
    '100%': {
        strokeDasharray: '89, 200',
        strokeDashoffset: '-134px',
    },
})

export const circular = style({
    animation: `${keyframesRotate} 2s linear infinite`,
    height: '100%',
    transformOrigin: 'center center',
    width: '100%',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    margin: 'auto',
})

export const path = style({
    strokeDasharray: '1, 200',
    strokeDashoffset: '0',
    animation: `${keyframesDash} 1.5s ease-in-out infinite, color 6s ease-in-out infinite`,
    strokeLinecap: 'round',
})
