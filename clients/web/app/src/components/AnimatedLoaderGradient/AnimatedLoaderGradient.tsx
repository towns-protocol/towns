import React from 'react'
import { Box, MotionBox } from '@ui'
import * as gradientStyle from './AnimatedLoaderGradient.css'

export const AnimatedLoaderGradient = () => {
    return (
        <MotionBox
            height="2"
            width="100%"
            position="relative"
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ marginBottom: '-2px' }}
        >
            <Box className={gradientStyle.animatedGradient} />
        </MotionBox>
    )
}
