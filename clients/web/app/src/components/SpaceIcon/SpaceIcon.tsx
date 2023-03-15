import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, BoxProps, Text } from '@ui'
import { useGetSpaceIcon } from 'api/lib/spaceIcon'
import { useUploadImageStore } from '@components/UploadImage/useUploadImageStore'
import { InteractiveTownsToken } from '@components/TownsToken/InteractiveTownsToken'
import { TownsTokenProps } from '@components/TownsToken/TownsToken'
import { LetterStyles, LetterStylesVariantProps } from './SpaceIcon.css'

const ImageVariants = {
    public: 'public',
    thumbnail100: 'thumbnail100',
    thumbnail50: 'thumbnail50',
    thumbnail300: 'thumbnail300',
} as const

export type ImageVariant = (typeof ImageVariants)[keyof typeof ImageVariants]

type Props = {
    spaceId: string
    firstLetterOfSpaceName: string
    letterFontSize?: LetterStylesVariantProps
    variant?: ImageVariant
} & BoxProps

const MotionBox = motion(Box)

// Primitive for grabbing a space icon image with a fallback to first letter of space name
export const SpaceIcon = (props: Props) => {
    const {
        spaceId,
        letterFontSize,
        firstLetterOfSpaceName,
        variant = ImageVariants.thumbnail300,
        ...boxProps
    } = props

    const {
        imageLoading,
        requestIsLoading,
        hasMadeFailedRequest,
        onLoad,
        isSuccess,
        imageSrc,
        renderKey,
    } = useLoadSpaceIcon(spaceId, variant)

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
                    <SpaceIconInitials letterFontSize={letterFontSize}>
                        {firstLetterOfSpaceName}
                    </SpaceIconInitials>
                )}
                {!hasMadeFailedRequest && !requestIsLoading && (
                    <AnimatePresence mode="wait">
                        {isSuccess ? (
                            <MotionBox
                                key={renderKey}
                                as="img"
                                src={imageSrc}
                                fit="full"
                                objectFit="cover"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: imageLoading ? 0 : 1 }}
                                exit={{ opacity: 0 }}
                                onLoad={onLoad}
                            />
                        ) : (
                            <SpaceIconInitials>{firstLetterOfSpaceName}</SpaceIconInitials>
                        )}
                    </AnimatePresence>
                )}
            </Box>
        </>
    )
}

export const InteractiveSpaceIcon = (
    props: Pick<Props, 'spaceId'> & Pick<TownsTokenProps, 'size' | 'address' | 'spaceName'>,
) => {
    const { size, spaceName: name, address } = props

    const imageVariant = size === 'sm' ? ImageVariants.thumbnail100 : ImageVariants.thumbnail300
    const { imageSrc, renderKey } = useLoadSpaceIcon(props.spaceId, imageVariant)
    return (
        <InteractiveTownsToken
            size={size}
            imageSrc={imageSrc}
            address={address}
            spaceName={name}
            imageSrcRenderKey={renderKey}
        />
    )
}

const SpaceIconInitials = (props: {
    letterFontSize?: LetterStylesVariantProps
    children?: React.ReactNode
}) => (
    <Text
        strong
        textTransform="uppercase"
        className={LetterStyles(props.letterFontSize ? { fontSize: props.letterFontSize } : {})}
    >
        {props.children}
    </Text>
)

export const useLoadSpaceIcon = (spaceId: string, variant: ImageVariant) => {
    const renderKey = useUploadImageStore((state) => state.renderKeys[spaceId])

    // leveraging react query cache to check an image exists, trigger rerenders on upload and other UI
    const {
        isLoading: requestIsLoading,
        isSuccess,
        failureCount,
    } = useGetSpaceIcon({
        spaceId,
    })

    // - we could return the Image from useGetSpaceIcon() and set that as img.src but the hook should only need to check a single "public"  variant. Passing all the variants results in addl. 404s if the image doesn't exist
    // - if for some reason we start seeing issues where CF is creating a "public" variant much faster than the others, resulting in 404 for IMAGE_DELIVERY_URL, then we consider passing variant to hook
    // - this is mainly only an issue for an uploading user, not the vast majority of users
    const imageSrc = `https://imagedelivery.net/qaaQ52YqlPXKEVQhjChiDA/${spaceId}/${variant}`

    const [imageLoading, setImageLoading] = useState<boolean>(true)

    const onLoad = useCallback(() => {
        setImageLoading(false)
    }, [])

    // reset image loading when the render key changes so the image fades in again
    useEffect(() => {
        setImageLoading(true)
    }, [renderKey])

    const hasMadeFailedRequest = failureCount > 0

    return {
        renderKey,
        imageLoading,
        requestIsLoading,
        hasMadeFailedRequest,
        isSuccess,
        onLoad,
        imageSrc,
    }
}
