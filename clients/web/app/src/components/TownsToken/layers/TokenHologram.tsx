import React from 'react'
import * as styles from '../TownsToken.css'
import Pattern from '../assets/pattern2.webp'

const rainbow = `linear-gradient(0deg, ${Array(10)
    .fill(0)
    .map((_, i, a) => `hsl(${0 + (180 / a.length) * i}, 100%, 60%)`)})`

const combinedBackgroundStyle = (() => {
    const imageBackground: { [key: string]: string } = {
        backgroundImage: `url(${Pattern})`,
        backgroundSize: `180px`,
        backgroundPosition: `center center`,
        backgroundBlendMode: `multiply`,
    } as const

    const rainbowBackground: { [key: string]: string } = {
        backgroundImage: rainbow,
        backgroundSize: `100%`,
        backgroundPosition: `calc(var(--tk-y, 0) * 30px)`,
        backgroundBlendMode: `overlay`,
    } as const

    const gradientBackground1: { [key: string]: string } = {
        backgroundImage: `repeating-linear-gradient(-45deg, #000f 0%, #ffff 17%,#000f 25%)`,
        backgroundSize: `1000px`,
        backgroundPosition: `calc(-180px + (1 * var(--tk-mint, 0) + var(--tk-x, 0)) * 50px)`,
        backgroundBlendMode: `exclusion`,
    } as const

    const gradientBackground2: { [key: string]: string } = {
        backgroundImage: `repeating-linear-gradient(-45deg, #000f 0%, #ffff 17%,#000f 25%)`,
        backgroundSize: `1000px`,
        backgroundPosition: `calc(-280px + (-1 * var(--tk-mint, 0) + var(--tk-x, 0)) * -180px)`,
        backgroundBlendMode: `exclusion`,
    } as const

    const backgrounds = [
        gradientBackground2,
        gradientBackground1,
        imageBackground,
        rainbowBackground,
    ]

    return backgrounds.reduce((css, bg) => {
        Object.keys(bg).forEach((k: string) => {
            css[k] = !css[k] ? bg[k] : `${css[k]}, ${bg[k]}`
        })
        return css
    }, {} as { [key: string]: string })
})()

export const HologramLayer = () => {
    return (
        <div
            id="gradients"
            className={styles.absoluteFill}
            style={
                {
                    ...combinedBackgroundStyle,
                    position: `absolute`,
                    overflow: 'hidden',
                    top: `0`,
                    left: `0`,
                    width: `100%`,
                    height: `100%`,
                    //  0 1 -> -1 0 +1
                    ['--tk-mt-step']: `calc(1 - 2 * var(--tk-mint, 0))`,
                    // -1 0 +1 -> 1 0 1
                    ['--tk-mt-abs']: `max(var(--tk-mt-step), -1 * var(--tk-mt-step))`,
                    opacity: `calc(
                        var(--tk-rad-abs, 0) + 
                        1 * (1 - var(--tk-mt-abs))
                    )`,
                    mixBlendMode: `color-dodge`,
                } as React.CSSProperties
            }
        />
    )
}
