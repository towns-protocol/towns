import React from 'react'
import { useImageStore } from 'use-towns-client'
import { Box, BoxProps } from '@ui'
import { FitMaxHeading } from 'ui/components/Text/FitMaxHeading'
import * as styles from './TownsToken.css'
import { TokenAddress } from './layers/TokenAddress'
import { HologramLayer } from './layers/TokenHologram'
import { TokenShadow } from './layers/TokenShadow'
import { TownsTokenConfig, TownsTokenSize } from './TownsTokenConfig'

type Props = {
    spaceName?: string
    address?: string
    spaceId?: string
    size: TownsTokenSize
    imageSrc?: string
    reduceMotion?: boolean
    // imageSrcRenderKey?: string
} & Omit<BoxProps, 'size'>

export type TownsTokenProps = Props

export const TownsToken = (props: Props) => {
    const { imageSrc, address, size, spaceName, reduceMotion, spaceId, ...boxProps } = props
    const config = TownsTokenConfig.sizes[size]

    const loaded = useImageStore((state) => (spaceId ? state.loadedResource?.[spaceId] : false))
    const error = useImageStore((state) => (spaceId ? state.erroredResources?.[spaceId] : true))

    const onLoad = () => {
        if (spaceId) {
            useImageStore.getState().setLoadedResource(spaceId, { imageUrl: imageSrc })
        }
    }
    const onError = () => {
        if (spaceId) {
            useImageStore.getState().addErroredResource(spaceId)
        }
    }
    const initial = spaceName?.trim()[0] ?? ''

    return (
        <Box
            position="relative"
            style={{
                width: config.containerSize,
                height: config.containerSize,
                minWidth: config.containerSize,
                minHeight: config.containerSize,
                perspective: `${config.containerSize}px`,
                perspectiveOrigin: `center`,
                transformStyle: `preserve-3d`,
            }}
        >
            <TokenShadow size={config.badgeSize} />
            <Box className={styles.transformContainer}>
                <TokenAddress
                    size={config.addressSize}
                    fontSize={config.fontSize}
                    address={address}
                    radius={config.addressRadius}
                    reduceMotion={reduceMotion}
                />
                <Box
                    borderRadius={config.borderRadius}
                    className={styles.absoluteCenterTransform}
                    style={{
                        width: config.badgeSize,
                        height: config.badgeSize,
                        top: `50%`,
                        left: `50%`,
                        transform: `translate(-50%,-50%)`,
                    }}
                    overflow="hidden"
                    background="level1"
                    {...boxProps}
                >
                    <Box absoluteFill centerContent>
                        {imageSrc && !error ? (
                            <img
                                src={imageSrc}
                                width="100%"
                                height="100%"
                                style={{ opacity: loaded ? 1 : 0, objectFit: 'cover' }}
                                onLoad={onLoad}
                                onError={onError}
                            />
                        ) : (
                            <Box position="absoluteCenter">
                                <FitMaxHeading
                                    align="center"
                                    width={config.badgeSize * 0.75}
                                    maxHeight={config.maxTextHeight}
                                >
                                    {initial}
                                </FitMaxHeading>
                            </Box>
                        )}
                    </Box>
                    <HologramLayer />
                </Box>
            </Box>
        </Box>
    )
}
