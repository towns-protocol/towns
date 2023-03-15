import { style } from '@vanilla-extract/css'
import { vars } from 'ui/styles/vars.css'

const absoluteCenter = style({
    position: 'absolute',
    top: `50%`,
    left: `50%`,
})

export const absoluteCenterTransform = style({
    position: 'absolute',
    top: `50%`,
    left: `50%`,
    transform: `translate(-50%,-50%)`,
})

export const absoluteFill = style({
    position: 'absolute',
    inset: 0,
})

export const transformContainer = style([
    absoluteFill,
    {
        transformStyle: `preserve-3d`,
        transformOrigin: `center center`,
        transform: `
            translateZ(calc((1 - var(--tk-h,1)) * 30px))
            rotateY(calc(var(--p-d,1) * 0.10 * -3.14rad * var(--tk-x, 0)))
            rotateX(calc(var(--p-d, 1) * 0.10 * 3.14rad * var(--tk-y, 0)))
        `,
    },
])

export const letters = style({
    color: vars.color.foreground.gray2,
    display: 'inline-block',
})

export const addressContainer = style([
    absoluteCenterTransform,
    {
        transformStyle: `preserve-3d`,
        transformOrigin: `center center`,
        transform: `
            translateZ(calc((1 - var(--tk-h,1)) * 300px))
            rotateY(calc(var(--p-d,1) * 0.1 * -3.14rad * var(--tk-x, 0)))
            rotateX(calc(var(--p-d, 1) * 0.1 * 3.14rad * var(--tk-y, 0)))
        `,
    },
])

export const tokenShadow = style([
    absoluteCenter,
    {
        opacity: 0.33,
        filter: `blur(calc((0.1 + 0.9 * var(--tk-h,1)) * 20px))`,
        transformOrigin: `center center`,
        background: `#000`,
    },
])
