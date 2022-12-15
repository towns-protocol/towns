import React, { SVGProps } from 'react'
import { Box } from '@ui'
import Chair from '../assets/chair.png'
import * as styles from './TokenBadge.css'
import { BadgeText } from './TokenBadgeText'

type Props = {
    name?: string
    address?: string
}

export const Badge = ({ name = '', address }: Props) => (
    <Box className={styles.transformContainer}>
        <div className={styles.imageContainer}>
            <img src={Chair} className={styles.image} />
        </div>
        <div className={styles.badgeContent}>
            <svg viewBox="0 0 360 360" width="360" height="360">
                <defs>
                    <WaveDef />
                    <WaveMaskDef />
                    <mask id="donut">
                        <rect width="360" height="360" fill="white" />
                        <circle r="114" cx="180" cy="180" fill="black" />
                    </mask>
                </defs>
                {/* masked container */}a
                <g mask={`url(#${WaveMaskDef.id})`}>
                    <Background mask="url(#donut)" />
                    <g transform="translate(180,180)">
                        <InnerBorder />
                        <OuterBorder />
                    </g>

                    <Glare className={styles.glare} />
                </g>
                <g transform="translate(180, 180)">
                    <OuterBorder />
                </g>
            </svg>
        </div>

        <div className={styles.textLayer}>
            <BadgeText name={name} address={address} />
        </div>
    </Box>
)

const Background = (props: SVGProps<SVGGeometryElement>) => (
    <g fill="#111" {...props}>
        <circle cx={180} cy={180} r={174} />
    </g>
)

const OuterBorder = () => (
    <g transform="translate(-160,-160)" fill="none" color="#fff">
        <use xlinkHref={`#${WaveDef.id}`} />
    </g>
)

const InnerBorder = () => (
    <g stroke="#999" strokeWidth={6} fill="none">
        <circle cx={0} cy={0} r={114} />
    </g>
)

const Glare = (props: SVGProps<SVGCircleElement>) => (
    <>
        <defs>
            <radialGradient id="glareGradient">
                <stop offset="0.00" stopColor="rgba(255,255,255,1.0)" />
                <stop offset="0.30" stopColor="rgba(255,255,255,0.5)" />
                <stop offset="0.66" stopColor="rgba(255,255,255,0.1)" />
                <stop offset="1.00" stopColor="rgba(255,255,255,0.0)" />
            </radialGradient>
        </defs>
        <circle cx={0} cy={0} r={220} fill="url(#glareGradient)" {...props} />
    </>
)

export const WaveDef = (props: SVGProps<SVGGraphicsElement>) => (
    <g
        id={WaveDef.id}
        stroke="currentColor"
        strokeWidth="6"
        {...props}
        transform="translate(-61,-60)"
    >
        <path d="M248.884 50.7035C252.472 51.9595 256.22 52.7049 260.016 52.9178L277.438 53.8949C285.26 54.3336 292.701 57.4158 298.543 62.6366L311.557 74.2691C314.392 76.8028 317.569 78.9254 320.994 80.5747L336.707 88.1401C343.766 91.5387 349.461 97.2339 352.86 104.293L360.427 120.008C362.076 123.434 364.198 126.611 366.732 129.445L378.36 142.455C383.581 148.296 386.663 155.738 387.102 163.56L388.079 180.978C388.292 184.774 389.037 188.521 390.293 192.11L396.057 208.578C398.645 215.973 398.645 224.027 396.057 231.422L390.294 247.886C389.039 251.474 388.293 255.222 388.08 259.018L387.103 276.44C386.664 284.262 383.582 291.703 378.361 297.545L366.733 310.555C364.199 313.39 362.077 316.566 360.427 319.992L352.86 335.709C349.461 342.768 343.766 348.463 336.707 351.862L320.987 359.43C317.562 361.08 314.385 363.202 311.55 365.736L298.543 377.362C292.702 382.583 285.26 385.665 277.438 386.104L260.02 387.081C256.224 387.294 252.477 388.039 248.888 389.295L232.42 395.059C225.025 397.647 216.971 397.647 209.576 395.059L193.106 389.294C189.518 388.038 185.77 387.293 181.974 387.08L164.558 386.103C156.736 385.665 149.295 382.582 143.454 377.362L130.452 365.741C127.618 363.207 124.441 361.085 121.015 359.435L105.289 351.863C98.2302 348.465 92.535 342.77 89.1363 335.711L81.5658 319.987C79.9165 316.562 77.7938 313.385 75.2602 310.55L63.6351 297.544C58.4143 291.703 55.332 284.262 54.8933 276.44L53.9164 259.019C53.7035 255.223 52.9581 251.476 51.7021 247.887L45.9391 231.422C43.351 224.027 43.351 215.973 45.9391 208.578L51.7037 192.108C52.9596 188.52 53.705 184.772 53.9179 180.976L54.8947 163.56C55.3333 155.738 58.4156 148.297 63.6364 142.456L75.261 129.45C77.7946 126.615 79.9172 123.438 81.5666 120.013L89.1365 104.291C92.5351 97.2321 98.2303 91.5369 105.289 88.1383L121.008 80.5697C124.434 78.9203 127.611 76.7977 130.445 74.264L143.454 62.637C149.295 57.4162 156.736 54.334 164.559 53.8953L181.979 52.9183C185.775 52.7054 189.522 51.96 193.111 50.7041L209.576 44.9411C216.971 42.353 225.025 42.353 232.42 44.9411L248.884 50.7035Z" />
    </g>
)

WaveDef.id = 'wave-def'

const WaveMaskDef = () => (
    <mask id={WaveMaskDef.id}>
        <g stroke="#000" strokeWidth={6} fill="#fff" transform="translate(20,20)">
            <use xlinkHref={`#${WaveDef.id}`} />
        </g>
    </mask>
)

WaveMaskDef.id = 'wave-mask-def'
