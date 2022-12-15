import { style } from '@vanilla-extract/css'

const absoluteCenter = style({
    position: 'absolute',
    top: `50%`,
    left: `50%`,
})

const absoluteFill = style({
    position: 'absolute',
    inset: 0,
})

export const transformContainer = style([
    absoluteFill,
    {
        transformStyle: `preserve-3d`,
        transformOrigin: `center center`,
        transform: `
            translateZ(calc((1 - var(--tk-h,1)) * -30px))
            rotateY(calc(var(--p-d,1) * 0.10 * -3.14rad * var(--tk-x, 0)))
            rotateX(calc(var(--p-d, 1) * 0.10 * 3.14rad * var(--tk-y, 0)))
        `,
    },
])

export const badgeContent = style([absoluteCenter, { transform: `translate(-50%,-50%)` }])

export const imageContainer = style([
    absoluteFill,
    {
        transform: `
            scale(0.55) 
            translateZ(calc( 1px *(-30 + 15 * (1 - var(--tk-h, 1))))
        )
    `,
    },
])

export const image = style([
    absoluteCenter,
    {
        transform: `translate(-50%,-50%)`,
        clipPath: `circle(250px at center)`,
    },
])

export const glare = style([
    {
        opacity: `calc(var(--tk-d, 1) * 0.25)`,
        transform: `translate(
        calc(180px + 1 * var(--tk-mx, +0.5) * 180px),
        calc(180px + 1 * var(--tk-my, -0.5) * 180px)
    )`,
    },
])

export const textLayer = style([
    absoluteCenter,
    {
        transform: `
            translate(-50%,-50%) 
            translateZ(calc(5px + (var(--tk-h, 1)) * 15px))
        `,
    },
])
