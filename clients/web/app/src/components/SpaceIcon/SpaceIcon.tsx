import React, { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useImageStore } from 'use-towns-client'
import { Box, BoxProps, MotionBox } from '@ui'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { TownsTokenProps } from '@components/TownsToken/TownsToken'
import { ImageVariant, ImageVariants, useImageSource } from '@components/UploadImage/useImageSource'
import { LetterStylesVariantProps } from '@components/IconInitials/IconInitials.css'
import { IconInitials } from '@components/IconInitials/IconInitials'

type Props = {
    spaceId: string
    firstLetterOfSpaceName: string
    letterFontSize?: LetterStylesVariantProps
    variant?: ImageVariant
    /* used to toggle official NFT image - may remove in the future */
    overrideSrc?: string
    overrideBorderRadius?: BoxProps['borderRadius']
    fadeIn: boolean
    reduceMotion?: boolean
} & BoxProps

// Primitive for grabbing a space icon image with a fallback to first letter of space name
export const SpaceIcon = (props: Props) => {
    const {
        spaceId,
        letterFontSize,
        firstLetterOfSpaceName,
        overrideSrc,
        overrideBorderRadius,
        variant = ImageVariants.thumbnail300,
        fadeIn,
        ...boxProps
    } = props

    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const { imageSrc } = useImageSource(spaceId, variant)
    const onLoad = () => {
        useImageStore.getState().setLoadedResource(spaceId, { imageUrl: imageSrc })
        setImageLoaded(true)
    }
    const onError = () => {
        useImageStore.getState().addErroredResource(spaceId)
        setImageError(true)
    }

    return (
        <>
            <Box
                centerContent
                horizontal
                key={imageSrc}
                background="level2"
                borderRadius={overrideBorderRadius ?? 'full'}
                flexDirection="row"
                overflow="hidden"
                position="relative"
                {...boxProps}
            >
                {imageError && (
                    <IconInitials letterFontSize={letterFontSize}>
                        {firstLetterOfSpaceName}
                    </IconInitials>
                )}
                {!imageError && (
                    <AnimatePresence mode="wait">
                        <MotionBox
                            pointerEvents="none"
                            as="img"
                            src={overrideSrc ?? imageSrc}
                            fit="full"
                            objectFit="cover"
                            initial={{ opacity: fadeIn ? 0 : 1 }}
                            animate={{ opacity: imageLoaded || !fadeIn ? 1 : 0 }}
                            exit={{ opacity: fadeIn ? 0 : 1 }}
                            onLoad={onLoad}
                            onError={onError}
                        />
                    </AnimatePresence>
                )}
            </Box>
        </>
    )
}

export const InteractiveSpaceIcon = (
    props: Pick<Props, 'spaceId' | 'overrideSrc'> &
        Pick<TownsTokenProps, 'size' | 'address' | 'spaceName' | 'reduceMotion'>,
) => {
    const { overrideSrc, size, spaceName: name, address } = props

    // todo: we probably need a x600 too
    const imageVariant = size === 'sm' ? ImageVariants.thumbnail300 : ImageVariants.thumbnail600
    const { imageSrc } = useImageSource(props.spaceId, imageVariant)
    return (
        <InteractiveTownsToken
            spaceId={props.spaceId}
            size={size}
            imageSrc={overrideSrc ?? imageSrc}
            address={address}
            spaceName={name}
            imageSrcRenderKey={imageSrc}
            reduceMotion={props.reduceMotion}
        />
    )
}
