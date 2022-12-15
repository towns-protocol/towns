import { style } from '@vanilla-extract/css'

export const SIZE = 500
export const HALF_SIZE = 250

const absoluteCenter = style({
    position: 'absolute',
    top: `50%`,
    left: `50%`,
})

export const container = style({
    position: 'relative',
    width: SIZE,
    minHeight: SIZE,
    perspective: `${SIZE}px`,
    perspectiveOrigin: `center`,
})

export const tokenShadow = style([
    absoluteCenter,
    {
        opacity: 0.33,
        filter: `blur(calc((0.1 + 0.9 * var(--tk-h,1)) * 20px))`,
        transformOrigin: `center center`,
    },
])
