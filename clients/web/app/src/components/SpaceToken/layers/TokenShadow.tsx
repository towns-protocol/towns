import React from 'react'
import { Box } from '@ui'
import * as styles from '../SpaceToken.css'
import { WaveDef } from './TokenBadge'

export const SpaceTokenShadow = () => (
    <Box
        position="absolute"
        className={styles.tokenShadow}
        style={{
            transform: `
                        translate(-50%,-50%)
                        translateZ(-50px)
                        scale(calc(1.05 + var(--tk-h,1) * 0.2))
                        scaleX(calc((1 - var(--tk-ax, 1)) * 0.1 + 0.9))
                        scaleY(calc((1 - var(--tk-ay, 1)) * 0.1 + 0.9))
                      `,
        }}
    >
        <svg viewBox="0 0 360 360" width="360" height="360">
            <g color="black" transform="translate(20,20)">
                <use href={`#${WaveDef.id}`} stroke="none" fill="black" />
            </g>
        </svg>
    </Box>
)
