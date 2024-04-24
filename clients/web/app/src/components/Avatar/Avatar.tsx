import { clsx } from 'clsx'
import React, { forwardRef, useCallback, useEffect, useMemo } from 'react'
import { Address, useUserLookupContext } from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { ImageVariant, useImageSource } from '@components/UploadImage/useImageSource'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { FadeInBox } from '@components/Transitions'
import { useGreenDot } from 'hooks/useGreenDot'
import { Box, BoxProps } from '@ui'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
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
const MAX_NFT_IMAGE_SIZE = 1_000_000

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

function useAvatarImageSrc(props: {
    imageVariant?: ImageVariant
    abstractAccountAddress?: string
}) {
    const { imageVariant = 'thumbnail100', abstractAccountAddress } = props
    const resourceId = useMemo(() => {
        return abstractAccountAddress ?? ''
    }, [abstractAccountAddress])

    const { imageSrc } = useImageSource(resourceId, imageVariant)

    return { imageSrc, resourceId }
}

export const Avatar = forwardRef<HTMLElement, Props>((props, ref) => {
    const isGreen = useGreenDot(props.userId)
    return <AvatarWithoutDot {...props} dot={isGreen} ref={ref} />
})

// pass a src prop to force using that image, otherwise pass userId
export const AvatarWithoutDot = forwardRef<HTMLElement, Props & { dot?: boolean }>((props, ref) => {
    const { src, userId, imageVariant, ...rest } = props
    const lookup = useUserLookupContext()
    const user = userId ? lookup.usersMap[userId] : undefined

    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address | undefined,
    })
    const _imageVariant = imageVariant ?? 'thumbnail100'
    const resolvedNft = useResolveNft({ walletAddress: userId ?? '', info: user?.nft })
    const nftUrl =
        resolvedNft?.image && resolvedNft.image.bytes < MAX_NFT_IMAGE_SIZE
            ? resolvedNft.image.gateway
            : resolvedNft?.image?.thumbnail

    const { imageSrc, resourceId } = useAvatarImageSrc({
        imageVariant: _imageVariant,
        abstractAccountAddress,
    })

    useEffect(() => {
        if (src && userId) {
            console.warn(
                'Avatar: You passed both a src and userId prop. Only the src prop will be used.',
            )
        }
    }, [src, userId])

    return (
        <_Avatar
            key={imageSrc}
            resourceId={nftUrl ? nftUrl : resourceId ? resourceId + '_' + _imageVariant : undefined}
            src={nftUrl ?? src ?? imageSrc}
            {...rest}
            ref={ref}
        />
    )
})

const _Avatar = forwardRef<
    HTMLElement,
    Omit<Props & { dot?: boolean }, 'userId'> & {
        resourceId: string | undefined
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
        ...boxProps
    } = props

    const Container = animate ? MotionBox : Box

    const onError = useCallback(() => {
        if (resourceId) {
            useImageStore.getState().addErroredResource(resourceId)
        }
    }, [resourceId])

    const onLoad = useCallback(() => {
        if (resourceId && src) {
            useImageStore.getState().setLoadedResource(resourceId, {
                imageUrl: src,
            })
        }
    }, [resourceId, src])

    const failedResource = useImageStore((state) => state.erroredResources[resourceId])
    const loadedResource = useImageStore((state) => state.loadedResource[resourceId])

    const content = () => {
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
    }

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
            <Box absoluteFill background="positive" borderRadius="full" />
        </FadeInBox>
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
                    backgroundImage: failedResource ? `url(/placeholders/pp1.png)` : 'none',
                }}
            >
                {content()}
            </Box>
            <AnimatePresence>{dot}</AnimatePresence>
        </Container>
    )
})
