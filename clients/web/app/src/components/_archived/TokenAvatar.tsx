import React, { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { Box, BoxProps, Icon, IconButton, Text, TooltipRenderer } from '@ui'
import { AvatarProps } from '@components/Avatar/Avatar'
import {
    avatarAtoms,
    avatarBaseStyle,
    avatarImageStyle,
    avatarToggleClasses,
} from '@components/Avatar/Avatar.css'
import { shortAddress } from 'ui/utils/utils'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { TriggerProps } from 'ui/components/Tooltip/TooltipRenderer'
import { TokenData } from '@components/Tokens/types'

const tokenAvatarImageSourceMap = new Map<string, string>()

const FALLBACK = 'fallback'

export type TokenAvatarProps = Partial<TokenData> & {
    contractAddress: string
    tokenIds: number[]
    size: AvatarProps['size']
    noLabel?: boolean
    noCopy?: boolean
    isLoading?: boolean
    horizontal?: 'horizontal'
    layoutProps?: BoxProps
    labelProps?: {
        size?: 'sm' | 'md'
        whiteSpace?: BoxProps['whiteSpace']
    }
    avatarToggleClasses?: Partial<typeof avatarToggleClasses>
}

/**
 * @deprecated
 */
export const TokenAvatar = (
    props: TokenAvatarProps & {
        onClick?: (
            {
                contractAddress,
                tokenIds,
            }: {
                contractAddress: string
                tokenIds: number[]
            },
            e: React.MouseEvent<HTMLElement, MouseEvent>,
        ) => void
    },
) => {
    const {
        imgSrc,
        label,
        contractAddress,
        tokenIds,
        onClick,
        size,
        noLabel,
        isLoading,
        noCopy = true,
        layoutProps,
        labelProps,
        avatarToggleClasses,
    } = props
    const _label = isLoading ? '' : label || shortAddress(contractAddress)
    const imageSource = useCheckImage({ src: imgSrc, contractAddress, isLoading })
    const isFallbackType = !isLoading && imageSource === FALLBACK
    const iconSize = size === 'avatar_x4' ? 'square_sm' : 'square_md'
    const clipboardCopyRef = useRef<HTMLDivElement | null>(null)
    const showLabel = !noLabel && _label

    const content = () => {
        if (isLoading) {
            return (
                <Box centerContent horizontal height="100%">
                    <ButtonSpinner />
                </Box>
            )
        }

        if (isFallbackType) {
            return (
                <Box centerContent horizontal height="100%">
                    <Icon type="token" size={iconSize} color="gray2" />
                </Box>
            )
        }
        if (imageSource) {
            return <img src={imageSource} className={avatarImageStyle} />
        }

        return null
    }

    return (
        <Box alignItems="center" maxWidth="x6" data-testid="token-avatar" gap="sm" {...layoutProps}>
            <Box position="relative" rounded={layoutProps?.rounded ?? 'full'} background="level4">
                {showLabel ? (
                    <AvatarImageWrapper size={size} toggleClasses={avatarToggleClasses}>
                        {content()}
                    </AvatarImageWrapper>
                ) : (
                    <TokenAddressTooltip
                        noCopy={noCopy}
                        contractAddress={contractAddress}
                        clipboardCopyRef={clipboardCopyRef}
                    >
                        {(triggerProps) => (
                            <Box {...triggerProps}>
                                <AvatarImageWrapper size={size} toggleClasses={avatarToggleClasses}>
                                    {content()}
                                </AvatarImageWrapper>
                            </Box>
                        )}
                    </TokenAddressTooltip>
                )}

                {onClick && contractAddress && (
                    <IconButton
                        style={{
                            top: '-10%',
                            right: '-10%',
                        }}
                        top="none"
                        right="none"
                        rounded="full"
                        translate="yes"
                        size="square_xxs"
                        position="absolute"
                        icon="close"
                        background="level4"
                        border="faint"
                        color="default"
                        onClick={(e) => onClick({ contractAddress, tokenIds: [] }, e)}
                    />
                )}
            </Box>

            {showLabel && (
                <TokenAddressTooltip
                    contractAddress={contractAddress}
                    noCopy={noCopy}
                    clipboardCopyRef={clipboardCopyRef}
                >
                    {(triggerProps) => (
                        <Box
                            gap
                            {...triggerProps}
                            onClick={() => {
                                clipboardCopyRef.current?.click()
                            }}
                        >
                            <Text size="sm" color="default" textAlign="center" {...labelProps}>
                                {_label}
                            </Text>
                            {tokenIds.length > 0 && (
                                <Box horizontal gap="xs" flexWrap="wrap">
                                    {tokenIds.map((tokenId) => (
                                        <Box
                                            centerContent
                                            background="level4"
                                            key={contractAddress + tokenId.toString()}
                                            rounded="full"
                                            minWidth="x2"
                                            padding="xs"
                                            height="x2"
                                        >
                                            <Text display="block" size="xs">
                                                {tokenId}
                                            </Text>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}
                </TokenAddressTooltip>
            )}
        </Box>
    )
}

function AvatarImageWrapper({
    children,
    size,
    toggleClasses = {
        circle: true,
        noBg: true,
    },
}: React.PropsWithChildren<{
    size: TokenAvatarProps['size']
    toggleClasses?: Partial<typeof avatarToggleClasses>
}>) {
    return (
        <Box
            display="block"
            className={clsx(
                avatarToggleClasses(toggleClasses),
                avatarAtoms({
                    size,
                }),
                avatarBaseStyle,
            )}
            style={{
                overflow: 'hidden',
            }}
        >
            {children}
        </Box>
    )
}

function TokenAddressTooltip({
    contractAddress,
    noCopy,
    clipboardCopyRef,
    children,
}: Pick<TokenAvatarProps, 'contractAddress' | 'noCopy'> & {
    children: (props: TriggerProps) => React.ReactNode
    clipboardCopyRef: React.RefObject<HTMLDivElement>
}) {
    return (
        <TooltipRenderer
            tooltip={
                <Box background="level3" padding="sm" rounded="sm" border="faint">
                    {noCopy ? (
                        <Text color="gray2" size="sm">
                            {contractAddress}
                        </Text>
                    ) : (
                        <ClipboardCopy
                            ref={clipboardCopyRef}
                            label={contractAddress}
                            clipboardContent={contractAddress}
                        />
                    )}
                </Box>
            }
            trigger="hover"
        >
            {(props) => children(props.triggerProps)}
        </TooltipRenderer>
    )
}

function useCheckImage({
    src,
    contractAddress,
    isLoading,
}: {
    src: string | undefined
    contractAddress: string
    isLoading?: boolean
}) {
    const [imageSource, setImageSource] = React.useState<string | undefined>(undefined)

    useEffect(() => {
        if (isLoading) {
            return
        }

        if (tokenAvatarImageSourceMap.has(contractAddress)) {
            setImageSource(tokenAvatarImageSourceMap.get(contractAddress))
            return
        }

        // if no image src was passed in, check that we haven't uploaded a custom image for this token for alpha cohorts
        // once past alpha, we can remove the cf image check and simply set FALLBACK if no src passed in
        if (!src) {
            const cloudflareImage = new Image()
            // CF images should have been uploaded via base64 encoded contract address
            cloudflareImage.src = `https://imagedelivery.net/qaaQ52YqlPXKEVQhjChiDA/${window.btoa(
                contractAddress.toLowerCase(),
            )}/thumbnail100`
            cloudflareImage.onload = () => {
                setImageSource(cloudflareImage.src)
                tokenAvatarImageSourceMap.set(contractAddress, cloudflareImage.src)
            }

            cloudflareImage.onerror = () => {
                setImageSource(FALLBACK)
                tokenAvatarImageSourceMap.set(contractAddress, FALLBACK)
            }

            return
        }

        const image = new Image()
        image.src = src
        image.onload = () => {
            setImageSource(src)
            tokenAvatarImageSourceMap.set(contractAddress, src)
        }

        image.onerror = () => {
            setImageSource(FALLBACK)
            tokenAvatarImageSourceMap.set(contractAddress, FALLBACK)
        }
    }, [src, contractAddress, isLoading])
    return imageSource
}
