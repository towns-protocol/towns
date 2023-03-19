import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import React, { forwardRef, useCallback, useEffect, useMemo } from 'react'
import { createUserIdFromString } from 'use-zion-client'
import { ImageVariant, useImageSource } from '@components/UploadImage/useImageSource'
import { useImageStore } from '@components/UploadImage/useImageStore'
import { Box, BoxProps } from '../Box/Box'
import {
    AvatarAtoms,
    avatarAtoms,
    avatarBaseStyle,
    avatarImageStyle,
    avatarToggleClasses,
} from './Avatar.css'

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
    imageVariant?: ImageVariant
} & Omit<AvatarAtoms, 'circle'>

export type AvatarProps = Props

function useAvatarImageSrc(props: { imageVariant?: ImageVariant; userId?: string }) {
    const { imageVariant = 'thumbnail100', userId } = props
    const resourceId = useMemo(() => {
        return createUserIdFromString(userId ?? '')?.accountAddress ?? ''
    }, [userId])

    const { imageSrc } = useImageSource(resourceId, imageVariant)

    return { imageSrc, resourceId }
}

// pass a src prop to force using that image, otherwise pass userId
export const Avatar = forwardRef<HTMLElement, Props>((props, ref) => {
    const { src, userId, imageVariant, ...rest } = props
    const _imageVariant = imageVariant ?? 'thumbnail100'
    const { imageSrc, resourceId } = useAvatarImageSrc({
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

    return (
        <_Avatar
            key={imageSrc}
            resourceId={resourceId + '_' + _imageVariant}
            src={src ?? imageSrc}
            {...rest}
            ref={ref}
        />
    )
})

const _Avatar = forwardRef<HTMLElement, Omit<Props, 'userId'> & { resourceId: string }>(
    (props, ref) => {
        const {
            animate = false,
            size = 'avatar_md',
            height = 'avatar_md',
            type = 'user',
            stacked = false,
            border,
            src,
            resourceId,
            ...boxProps
        } = props

        const Container = animate ? MotionBox : Box

        const onError = useCallback(() => {
            if (resourceId) {
                useImageStore.getState().addErroredResource(resourceId)
            }
        }, [resourceId])

        const onLoad = useCallback(() => {
            if (src) {
                useImageStore.getState().setLoadedResource(resourceId, {
                    imageUrl: src,
                })
            }
        }, [resourceId, src])

        const failedResource = useImageStore((state) => state.erroredResources[resourceId])
        const loadedResource = useImageStore((state) => state.loadedResource[resourceId])

        return (
            <Container
                display="block"
                variants={{ initial: { scale: 1 }, hover: { scale: 1.1 } }}
                ref={ref}
                shrink={false}
                position="relative"
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
                    overflow: 'hidden',
                }}
                {...boxProps}
            >
                {loadedResource && <img src={src} className={avatarImageStyle} />}

                {/* initial image load - this should render for each resourceId once to save the failed/loaded state so subsequent instances don't need to check */}
                {src && !failedResource && !loadedResource && (
                    <img
                        src={src}
                        className={avatarImageStyle}
                        style={{
                            opacity: 0,
                        }}
                        onLoad={onLoad}
                        onError={onError}
                    />
                )}
            </Container>
        )
    },
)

const MotionBox = motion(Box)
