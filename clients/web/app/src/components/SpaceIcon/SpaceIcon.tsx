import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, BoxProps, Text } from '@ui'
import { useGetSpaceIcon } from 'api/lib/spaceIcon'
import { useUploadImageStore } from '@components/UploadImage/UploadImage'
import { LetterStyles, LetterStylesVariantProps } from './SpaceIcon.css'

const ImageVariants = {
    public: 'public',
    thumbnail100: 'thumbnail100',
    thumbnail50: 'thumbnail50',
    thumbnail300: 'thumbnail300',
} as const

type Props = {
    spaceId: string
    firstLetterOfSpaceName: string
    letterFontSize?: LetterStylesVariantProps
    variant?: typeof ImageVariants[keyof typeof ImageVariants]
} & BoxProps

const MotionBox = motion(Box)

export const SpaceIcon = (props: Props) => {
    const {
        spaceId,
        letterFontSize,
        firstLetterOfSpaceName,
        variant = ImageVariants.thumbnail300,
        ...boxProps
    } = props
    const renderKey = useUploadImageStore((state) => state.renderKey)

    // TODO: we have cache issues with using the worker. Eventually we should use the worker and serve cached images. `base64` should be the img.src
    // for now we are using this to verify that an image exists for this space
    const {
        // data: { base64 } = {},
        isLoading: requestIsLoading,
        isSuccess,
        failureCount,
    } = useGetSpaceIcon({
        spaceId,
        useBypassUrl: true,
    })
    const IMAGE_DELIVERY_URL = `https://imagedelivery.net/qaaQ52YqlPXKEVQhjChiDA/${spaceId}/${variant}`

    const [imageLoading, setImageLoading] = useState<boolean>(true)

    const onLoad = useCallback(() => {
        setImageLoading(false)
    }, [])

    // reset image loading when the render key changes so the image fades in again
    useEffect(() => {
        setImageLoading(true)
    }, [renderKey])

    const hasMadeFailedRequest = failureCount > 0

    return (
        <>
            <Box
                centerContent
                horizontal
                background="level2"
                borderRadius="full"
                flexDirection="row"
                overflow="hidden"
                position="relative"
                {...boxProps}
            >
                {hasMadeFailedRequest && (
                    <Text
                        strong
                        textTransform="uppercase"
                        className={LetterStyles(letterFontSize ? { fontSize: letterFontSize } : {})}
                    >
                        {firstLetterOfSpaceName}
                    </Text>
                )}
                {!hasMadeFailedRequest && !requestIsLoading && (
                    <AnimatePresence mode="wait">
                        {isSuccess ? (
                            <MotionBox
                                key={renderKey}
                                as="img"
                                src={IMAGE_DELIVERY_URL}
                                fit="full"
                                objectFit="cover"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: imageLoading ? 0 : 1 }}
                                exit={{ opacity: 0 }}
                                onLoad={onLoad}
                            />
                        ) : (
                            <Text
                                strong
                                textTransform="uppercase"
                                className={LetterStyles(
                                    letterFontSize ? { fontSize: letterFontSize } : {},
                                )}
                            >
                                {firstLetterOfSpaceName}
                            </Text>
                        )}
                    </AnimatePresence>
                )}
            </Box>
        </>
    )
}
