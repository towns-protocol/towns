import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, BoxProps, Text } from '@ui'
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

    const { onLoad, onError, imageError, imageLoaded, imageSrc, renderKey } = useLoadSpaceIcon(
        spaceId,
        variant,
    )

    return (
        <>
            <Box
                centerContent
                horizontal
                key={renderKey}
                background="level2"
                borderRadius="full"
                flexDirection="row"
                overflow="hidden"
                position="relative"
                {...boxProps}
            >
                {imageError && (
                    <SpaceIconInitials letterFontSize={letterFontSize}>
                        {firstLetterOfSpaceName}
                    </SpaceIconInitials>
                )}
                {!imageError && (
                    <AnimatePresence mode="wait">
                        <MotionBox
                            as="img"
                            src={imageSrc}
                            fit="full"
                            objectFit="cover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: imageLoaded ? 1 : 0 }}
                            exit={{ opacity: 0 }}
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

export const useLoadSpaceIcon = (resourceId: string, variant: ImageVariant) => {
    const _renderKey = useUploadImageStore((state) => state.resources[resourceId]?.renderKey)
    const temporaryImageSrc = useUploadImageStore(
        (state) => state.resources[resourceId]?.temporaryImageUrl,
    )

    const imageSrc = `https://imagedelivery.net/qaaQ52YqlPXKEVQhjChiDA/${resourceId}/${variant}`
    const initialRenderKey = useRef<string>(resourceId + '_' + Date.now())

    const [imageLoaded, setImageLoaded] = useState<boolean>(false)
    const [imageError, setImageError] = useState<boolean>(false)

    const onLoad = useCallback(() => {
        // useUploadImageStore.getState().setRenderKey(resourceId, resourceId + '_' + Date.now())
        setImageLoaded(true)
    }, [])

    const onError = useCallback(() => {
        setImageError(true)
    }, [])

    // reset image loading when the render key changes
    useEffect(() => {
        setImageLoaded(false)
        setImageError(false)
    }, [_renderKey])

    const key = _renderKey || initialRenderKey.current
    return {
        renderKey: key,
        imageLoaded,
        onLoad,
        onError,
        imageError,
        // TODO: temporary cache busting
        // new images eventually show up, but the browser caches them and users who upload anything might see their old image for a while, even after refreshing
        // We're calling images directly from imagedelivery.net, we can't modify those headers unless we use some proxy - will need to revisit the CF worker or add a service worker interceptor
        imageSrc: temporaryImageSrc || imageSrc + `?${key}`,
    }
}
