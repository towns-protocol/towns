import React from 'react'

import Pattern from '../assets/pattern2.webp'

const rainbow = `linear-gradient(0deg, ${Array(10)
    .fill(0)
    .map((_, i, a) => `hsl(${0 + (180 / a.length) * i}, 100%, 60%)`)})`

const combinedBackgroundStyle = (() => {
    const imageBackground: { [key: string]: string } = {
        backgroundImage: `url(${Pattern})`,
        backgroundSize: `200px`,
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
        backgroundPosition: `calc(-180px + (-1 * var(--tk-mint, 0) + var(--tk-x, 0)) * -180px)`,
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
            style={
                {
                    ...combinedBackgroundStyle,
                    position: `absolute`,
                    top: `50%`,
                    left: `50%`,
                    width: 360,
                    height: 360,
                    //  0 1 -> -1 0 +1
                    ['--tk-mt-step']: `calc(1 - 2 * var(--tk-mint, 0))`,
                    // -1 0 +1 -> 1 0 1
                    ['--tk-mt-abs']: `max(var(--tk-mt-step), -1 * var(--tk-mt-step))`,
                    opacity: `calc(
                        var(--tk-rad-abs, 0) + 
                        1 * (1 - var(--tk-mt-abs))
                    )`,
                    mixBlendMode: `color-dodge`,
                    transformStyle: `preserve-3d`,
                    transformOrigin: `center`,
                    transform: `
                        translate(-50%,-50%)
                        scale(0.98,0.98)
                        translateZ(calc((1 - var(--tk-h,1)) * -30px))
                        rotateY(calc(var(--p-d,1) * 0.10 * -3.14rad * var(--tk-x, 0)))
                        rotateX(calc(var(--p-d,1) * 0.10 * 3.14rad * var(--tk-y, 0)))
                        
                      `,
                    clipPath: `path('M219.186 9.9225C215.67 9.72535 212.2 9.03509 208.877 7.87197L192.413 2.10948C184.377 -0.70316 175.623 -0.703159 167.587 2.10948L151.122 7.87249C147.798 9.03561 144.328 9.72587 140.813 9.92302L123.392 10.9C114.892 11.3768 106.805 14.7264 100.457 20.4002L87.4482 32.0273C84.8231 34.3736 81.8812 36.3393 78.7089 37.8667L62.9896 45.4352C55.3183 49.1288 49.129 55.3182 45.4354 62.9894L37.8655 78.7115C36.3381 81.8838 34.3724 84.8256 32.0261 87.4508L20.4016 100.457C14.7277 106.805 11.3781 114.892 10.9013 123.392L9.92457 140.808C9.72742 144.324 9.03716 147.794 7.87404 151.117L2.10948 167.587C-0.703159 175.623 -0.70316 184.377 2.10948 192.413L7.87249 208.878C9.03561 212.202 9.72587 215.672 9.92302 219.187L10.9 236.608C11.3768 245.108 14.7264 253.195 20.4002 259.543L32.0253 272.55C34.3717 275.175 36.3374 278.117 37.8648 281.289L45.4352 297.012C49.1288 304.683 55.3182 310.873 62.9894 314.566L78.7159 322.138C81.8882 323.666 84.83 325.632 87.4552 327.978L100.457 339.598C106.805 345.272 114.892 348.622 123.392 349.099L140.808 350.075C144.324 350.273 147.794 350.963 151.117 352.126L167.587 357.891C175.623 360.703 184.377 360.703 192.413 357.891L208.881 352.126C212.205 350.963 215.675 350.273 219.19 350.076L236.608 349.099C245.109 348.622 253.196 345.273 259.544 339.599L272.552 327.973C275.177 325.626 278.119 323.661 281.291 322.133L297.011 314.565C304.682 310.871 310.871 304.682 314.565 297.01L322.132 281.293C323.66 278.121 325.625 275.179 327.972 272.554L339.6 259.544C345.274 253.196 348.624 245.109 349.1 236.608L350.078 219.186C350.275 215.67 350.965 212.2 352.128 208.877L357.891 192.413C360.703 184.377 360.703 175.623 357.891 167.587L352.126 151.119C350.963 147.795 350.273 144.325 350.076 140.81L349.099 123.392C348.622 114.891 345.273 106.804 339.599 100.456L327.971 87.4462C325.625 84.8211 323.659 81.8792 322.131 78.707L314.565 62.9912C310.871 55.32 304.682 49.1306 297.01 45.4371L281.298 37.8717C278.126 36.3443 275.184 34.3787 272.559 32.0323L259.544 20.3998C253.196 14.726 245.109 11.3764 236.608 10.8996L219.186 9.9225Z')`,
                } as React.CSSProperties
            }
        />
    )
}
