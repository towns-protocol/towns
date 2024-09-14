import React from 'react'
import { AnimatePresence } from 'framer-motion'
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

    const { imageSrc, onLoad, onError, isError, isLoaded } = useImageSource(spaceId, variant)

    return (
        <>
            <Box
                centerContent
                horizontal
                key={`${imageSrc}-${spaceId}}`}
                background="level2"
                borderRadius={overrideBorderRadius ?? 'full'}
                flexDirection="row"
                overflow="hidden"
                position="relative"
                {...boxProps}
            >
                {isError && (
                    <IconInitials letterFontSize={letterFontSize}>
                        {firstLetterOfSpaceName}
                    </IconInitials>
                )}
                {!isError && (
                    <AnimatePresence mode="wait">
                        <MotionBox
                            key={`${imageSrc}-${spaceId}`}
                            pointerEvents="none"
                            as="img"
                            src={overrideSrc ?? imageSrc}
                            fit="full"
                            objectFit="cover"
                            initial={{ opacity: fadeIn ? 0 : 1 }}
                            animate={{ opacity: isLoaded || !fadeIn ? 1 : 0 }}
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
