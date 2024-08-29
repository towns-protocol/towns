import React from 'react'
import { BoxProps, MotionBox } from '@ui'
import { MotionBoxProps } from 'ui/components/Motion/MotionComponents'
import * as styles from './BlurredBackground.css'

type Props = {
    imageSrc: string | undefined
    blur?: number
    height?: BoxProps['height']
    initial?: MotionBoxProps['initial']
    animate?: MotionBoxProps['animate']
}

export const BlurredBackground = (props: Props) => {
    const { imageSrc, height, blur, initial, animate } = props
    return (
        <>
            <MotionBox
                layout
                position="absolute"
                top="none"
                left="none"
                right="none"
                height={height ?? '100%'}
                pointerEvents="none"
                initial={initial}
                className={styles.blurredBackgroundStyle}
                background="level1"
                opacity="0.8"
                animate={animate}
                transition={{ duration: 0.7 }}
            />
            <MotionBox
                layout
                position="absolute"
                top="none"
                left="none"
                right="none"
                zIndex="below"
                height={height ?? '100%'}
                pointerEvents="none"
                initial={initial}
                className={styles.blurredBackgroundStyle}
                style={{
                    backgroundImage: `url(${imageSrc})`,
                    filter: blur ? `blur(${blur}px)` : 'initial',
                }}
                animate={animate}
                key={imageSrc}
                transition={{ duration: 0.7 }}
            />
        </>
    )
}
