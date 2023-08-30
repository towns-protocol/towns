import React from 'react'
import { Box, Heading } from '@ui'
import * as styles from './TownsToken.css'
import { TokenAddress } from './layers/TokenAddress'
import { HologramLayer } from './layers/TokenHologram'
import { TokenShadow } from './layers/TokenShadow'
import { TownsTokenConfig, TownsTokenSize } from './TownsTokenConfig'

type Props = {
    spaceName?: string
    address?: string
    size: TownsTokenSize
    imageSrc?: string
    imageSrcRenderKey?: string
}

export type TownsTokenProps = Props

export const TownsToken = (props: Props) => {
    const { imageSrc } = props
    const config = TownsTokenConfig.sizes[props.size]
    const [loaded, setLoaded] = React.useState(false)
    const [error, setError] = React.useState(false)

    const onLoad = () => {
        setLoaded(true)
    }
    const onError = () => {
        setError(true)
    }
    const initial = props.spaceName ? props.spaceName[0] : ''

    return (
        <Box
            position="relative"
            style={{
                width: config.containerSize,
                height: config.containerSize,
                perspective: `300px`,
                perspectiveOrigin: `center`,
                transformStyle: `preserve-3d`,
            }}
        >
            <TokenShadow size={config.badgeSize} />
            <Box className={styles.transformContainer}>
                <TokenAddress
                    size={config.addressSize}
                    fontSize={config.fontSize}
                    address={props.address}
                    radius={config.addressRadius}
                />
                <Box
                    borderRadius="md"
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
                            <Heading level={1}>{initial}</Heading>
                        )}
                    </Box>
                    <HologramLayer />
                </Box>
            </Box>
        </Box>
    )
}
