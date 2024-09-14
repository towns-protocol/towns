import { clsx } from 'clsx'
import React, { forwardRef, useCallback, useEffect, useMemo } from 'react'
import { useImageStore, useUserLookup } from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { ImageVariant, useImageSource } from '@components/UploadImage/useImageSource'
import { FadeInBox } from '@components/Transitions'
import { useGreenDot } from 'hooks/useGreenDot'
import { Box, BoxProps } from '@ui'
import { useResolveNft } from 'hooks/useNfts'
import {
    AvatarAtoms,
    avatarAtoms,
    avatarBaseStyle,
    avatarImageStyle,
    avatarToggleClasses,
} from './Avatar.css'
import { Icon, IconProps } from '../../ui/components/Icon'
import { MotionBox } from '../../ui/components/Motion/MotionComponents'

type Props = {
    src?: string
    animate?: boolean
    type?: 'user' | 'space'
    onClick?: BoxProps['onClick']
    insetX?: BoxProps['insetX']
    insetY?: BoxProps['insetY']
    insetTop?: BoxProps['insetTop']
    insetBottom?: BoxProps['insetBottom']
    insetLeft?: BoxProps['insetLeft']
    insetRight?: BoxProps['insetRight']
    inset?: BoxProps['inset']
    boxShadow?: BoxProps['boxShadow']
    children?: React.ReactNode
    userId?: string
    icon?: IconProps['type']
    iconSize?: IconProps['size']
    imageVariant?: ImageVariant
} & Omit<AvatarAtoms, 'circle' | 'square'> &
    Pick<BoxProps, 'tooltip' | 'tooltipOptions'>

export type AvatarProps = Props

function useAvatarImageSrc(props: { imageVariant?: ImageVariant; userId?: string }) {
    const { imageVariant = 'thumbnail100', userId } = props
    const { imageSrc } = useImageSource(userId ?? '', imageVariant)

    return { imageSrc }
}

export const Avatar = forwardRef<HTMLElement, Props>((props, ref) => {
    const isGreen = useGreenDot(props.userId)
    return <AvatarWithoutDot {...props} dot={isGreen} ref={ref} />
})

// pass a src prop to force using that image, otherwise pass userId
export const AvatarWithoutDot = forwardRef<HTMLElement, Props & { dot?: boolean }>((props, ref) => {
    const { src, userId, imageVariant, ...rest } = props
    const user = useUserLookup(userId ?? '')

    const _imageVariant = imageVariant ?? 'thumbnail100'
    const resolvedNft = useResolveNft({ walletAddress: userId ?? '', info: user?.nft })
    const nftUrl = useMemo(() => {
        if (!resolvedNft) {
            return
        }

        if (resolvedNft.image.thumbnail) {
            return resolvedNft.image.thumbnail
        }
        // we had this check for bytes size, but what should we do if payload has no bytes?
        // if (resolvedNft.image.bytes && resolvedNft.image.bytes < MAX_NFT_IMAGE_SIZE) {
        //         return resolvedNft.image.gateway
        // }
        // there could be no bytes
        if (resolvedNft.image.gateway) {
            return resolvedNft.image.gateway
        }
    }, [resolvedNft])

    const { imageSrc } = useAvatarImageSrc({
        imageVariant: _imageVariant,
        userId,
    })

    useEffect(() => {
        if (src && userId) {
            console.warn(
                'Avatar: You passed both a src and userId prop. Only the src prop will be used.',
            )
        }
    }, [src, userId])

    const resourceId = useMemo(() => {
        if (!userId) {
            return ''
        }
        if (nftUrl) {
            return userId + '_' + nftUrl
        }
        return userId
    }, [userId, nftUrl])
    return (
        <_Avatar
            key={imageSrc}
            resourceId={resourceId}
            src={nftUrl ?? src ?? imageSrc}
            userId={userId}
            {...rest}
            ref={ref}
        />
    )
})

const _Avatar = forwardRef<
    HTMLElement,
    Props & {
        resourceId: string | undefined
        dot?: boolean
    }
>((props, ref) => {
    const {
        animate = false,
        size = 'avatar_md',
        height = 'avatar_md',
        type = 'user',
        stacked = false,
        border,
        src,
        resourceId = '',
        icon,
        dot: _dot,
        tooltip,
        tooltipOptions,
        onClick,
        iconSize,
        userId,
        ...boxProps
    } = props

    const Container = animate ? MotionBox : Box

    const { setLoadedResource, addErroredResource } = useImageStore((state) => ({
        setLoadedResource: state.setLoadedResource,
        addErroredResource: state.addErroredResource,
    }))
    const onError = useCallback(() => {
        if (resourceId) {
            addErroredResource(resourceId)
        }
    }, [addErroredResource, resourceId])

    const onLoad = useCallback(() => {
        if (resourceId && src) {
            setLoadedResource(resourceId, {
                imageUrl: src,
            })
        }
    }, [resourceId, setLoadedResource, src])

    const failedResource = useImageStore((state) => state.erroredResources[resourceId])
    const loadedResource = useImageStore((state) => state.loadedResource[resourceId])

    const content = useMemo(() => {
        if (icon) {
            return (
                <Box centerContent horizontal height="100%" background="level4">
                    <Icon type={icon} color="gray2" size={iconSize} />
                </Box>
            )
        }

        //initial image load - this should render for each resourceId once to save the failed/loaded state so subsequent instances don't need to check
        if (src && !failedResource && !loadedResource) {
            return (
                <img
                    src={src}
                    className={avatarImageStyle}
                    style={{
                        opacity: 0,
                    }}
                    onLoad={onLoad}
                    onError={onError}
                />
            )
        }

        if (loadedResource) {
            return <img src={src} className={avatarImageStyle} />
        }
    }, [failedResource, icon, iconSize, loadedResource, onError, onLoad, src])

    const dot = _dot && (
        <FadeInBox
            borderRadius="full"
            style={{
                position: `absolute`,
                right: `0%`,
                bottom: `0%`,
                width: `100%`,
                height: `100%`,
                maxWidth: `var(--dot-width, 50px)`,
                maxHeight: `var(--dot-width, 50px)`,
                borderColor: `var(--background)`,
                borderWidth: `var(--dot-border-width)`,
                borderStyle: `solid`,
                transformOrigin: `center center`,
                transform: ` rotate(45deg) translateX(var(--dot-offset, 50%)) scale(0.37)`,
            }}
        >
            <Box absoluteFill background="presence" borderRadius="full" />
        </FadeInBox>
    )

    const fallbackImage = useMemo(
        () => `url(/placeholders/${userId ? getFallbackIcon(userId) : 'pp1'}.png)`,
        [userId],
    )

    return (
        <Container
            display="block"
            ref={ref}
            shrink={false}
            position="relative"
            className={avatarAtoms({
                size: size ?? height,
            })}
            {...boxProps}
        >
            <Box
                absoluteFill
                overflow="hidden"
                tooltip={tooltip}
                tooltipOptions={tooltipOptions}
                onClick={onClick}
                {...boxProps}
                className={clsx(
                    avatarToggleClasses({ stacked, border, circle: type === 'user' }),
                    undefined,
                    avatarAtoms({
                        size: size ?? height,
                    }),
                    avatarBaseStyle,
                )}
                style={{
                    // all users should have a image uploaded but in the case they somehow don't, or fails to load, we use a placeholder image
                    backgroundImage: failedResource ? fallbackImage : 'none',
                }}
            >
                {content}
            </Box>
            <AnimatePresence>{dot}</AnimatePresence>
        </Container>
    )
})

function getFallbackIcon(userId: string): string {
    // pick last byte of address and convert to number, then mod 25 to get a
    // number between 1-25 (based on iOS version)
    const index = (parseInt(userId.slice(-2), 16) % 25) + 1
    return `pp${index}`
}
