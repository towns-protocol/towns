import React from 'react'
import { Box, MotionBox } from '@ui'
import * as gradientStyle from './AnimatedLoaderGradient.css'

export const AnimatedLoaderGradient = () => {
    return (
        <MotionBox
            height="1"
            width="100%"
            position="relative"
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
        >
            <Box className={gradientStyle.animatedGradient} />
        </MotionBox>
    )
}
