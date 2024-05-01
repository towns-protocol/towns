import { globalStyle, keyframes, style } from '@vanilla-extract/css'

const flashingKeyframes = keyframes({
    '0%': {
        fill: 'var(--dot-color)',
    },
    '25%': {
        fill: 'var(--background)',
    },
    '50%': {
        fill: 'var(--dot-color)',
    },
})

export const satelite = style({})

globalStyle(`${satelite} .dot`, {
    transition: 'fill 0.5s',
})

export const flashing = style({})

globalStyle(`${flashing} .dot`, {
    animation: `${flashingKeyframes} 1s infinite`,
    border: '1px solid var(--background-color)',
})
