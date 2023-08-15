import React from 'react'
import { MotionBox } from '@ui'
import { ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import * as styles from './BlurredBackground.css'

export const BlurredBackground = (props: { spaceSlug: string }) => {
    const { imageSrc } = useImageSource(props.spaceSlug, ImageVariants.thumbnail300)
    return (
        <MotionBox
            absoluteFill
            initial={{ filter: 'blur(50px)' }}
            animate={{ filter: 'blur(5px)' }}
            key={imageSrc}
            transition={{ duration: 0.7 }}
            className={styles.blurredBackgroundStyle}
            style={{ backgroundImage: `url(${imageSrc})` }}
        />
    )
}
