import { globalStyle, style } from '@vanilla-extract/css'
import { darkTheme, lightTheme, vars } from 'ui/styles/vars.css'

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
            translateZ(calc((1 - var(--tk-h,1)) * -10px))
            rotateY(calc(var(--p-d,1) * (0.055) * -3.14rad * var(--tk-x, 0)))
            rotateX(calc(var(--p-d,1) * (0.055) * 3.14rad * var(--tk-y, 0)))
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
            translateZ(calc((-1 + var(--tk-h,1)) * 5px))
            rotateY(calc(var(--p-d, 1) * 0.055 * -3.14rad * var(--tk-x, 0)))
            rotateX(calc(var(--p-d, 1) * 0.055 * 3.14rad * var(--tk-y, 0)))
        `,
    },
])

export const tokenShadow = style([
    absoluteCenter,
    {
        opacity: 1,
        filter: `blur(calc((0.2 + 0.8 * var(--tk-h,1)) * 20px))`,
        transformOrigin: `center center`,
    },
])

globalStyle(`${darkTheme} ${lightTheme} ${tokenShadow}, ${lightTheme} ${tokenShadow}`, {
    background: `#0003`,
})

globalStyle(`${darkTheme} ${tokenShadow}`, {
    background: `#000F`,
})
