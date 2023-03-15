import React from 'react'
import { Box } from '@ui'
import * as styles from '../TownsToken.css'

export const TokenShadow = (props: { size: number }) => (
    <Box
        borderRadius="md"
        overflow="hidden"
        position="absolute"
        className={styles.tokenShadow}
        style={{
            width: props.size,
            height: props.size,
            transform: `
                        translate(-50%,-50%)
                        translateZ(-50px)
                        scale(calc(1.05 + var(--tk-h,1) * 0.2))
                        scaleX(calc((1 - var(--tk-ax, 1)) * 0.1 + 0.9))
                        scaleY(calc((1 - var(--tk-ay, 1)) * 0.1 + 0.9))
                      `,
        }}
    />
)
