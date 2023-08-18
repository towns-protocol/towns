import React from 'react'
import { MotionBox } from '@ui'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import * as styles from './BlurredBackground.css'

export const BlurredBackground = (props: { spaceSlug: string; hidden: boolean }) => {
    const { hidden, spaceSlug } = props
    const { imageSrc } = useImageSource(spaceSlug, ImageVariants.thumbnail300)
    return (
        <MotionBox
            layout
            position="absolute"
            top="none"
            left="none"
            right="none"
            height="x20"
            pointerEvents="none"
            initial={{ filter: 'blur(50px)' }}
            animate={{ filter: 'blur(5px)', opacity: hidden ? 0 : 1 }}
            key={imageSrc}
            transition={{ duration: 0.7 }}
            className={styles.blurredBackgroundStyle}
            style={{ backgroundImage: `url(${imageSrc})` }}
        />
    )
}
