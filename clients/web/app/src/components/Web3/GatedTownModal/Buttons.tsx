import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConnectivity } from 'use-towns-client'
import { BoxProps, Icon, MotionBox, Stack, Text } from '@ui'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { openSeaBaseAssetUrl } from '../utils'

const buttonStyle: Partial<BoxProps> = {
    centerContent: true,
    horizontal: true,
    position: 'relative',
    cursor: 'pointer',
    as: 'button',
    rounded: 'sm',
    width: '100%',
    height: 'x6',
    color: 'default',
    background: 'level3',
    overflow: 'hidden',
}

export function CopyWalletAddressButton({
    text,
    address,
    onClick,
}: {
    text?: string
    address?: string
    onClick?: () => void
}) {
    const { loggedInWalletAddress } = useConnectivity()
    const addressToCopy = address || loggedInWalletAddress
    const [copied, setCopied] = useState(false)

    const [, copy] = useCopyToClipboard()

    const onCopy = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation()
            if (!addressToCopy) {
                return
            }
            await copy(addressToCopy)
            setCopied(true)
            onClick?.()
        },
        [addressToCopy, copy, onClick],
    )

    useEffect(() => {
        if (copied) {
            const timeout = setTimeout(() => {
                setCopied(false)
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [copied])

    return (
        <Stack {...buttonStyle} onClick={onCopy}>
            <MotionBox
                horizontal
                gap
                centerContent
                whiteSpace="nowrap"
                position="absoluteCenter"
                opacity="transparent"
                aria-hidden={!copied}
                animate={{
                    opacity: copied ? 1 : 0,
                    transform: copied
                        ? 'translate(-50%, -50%)'
                        : `translate(calc(-50% - 100px), -50%)`,
                }}
            >
                <Icon
                    size={{
                        mobile: 'square_xs',
                        desktop: 'square_sm',
                    }}
                    type="copy"
                />
                <Text
                    size={{
                        mobile: 'sm',
                    }}
                >
                    Copied!
                </Text>
            </MotionBox>
            <MotionBox
                horizontal
                centerContent
                gap
                aria-hidden={copied}
                position="absoluteCenter"
                whiteSpace="nowrap"
                animate={{
                    opacity: copied ? 0 : 1,
                    transform: copied
                        ? `translate(calc(-50% + 100px), -50%)`
                        : 'translate(-50%, -50%)',
                }}
            >
                <Icon
                    size={{
                        mobile: 'square_xs',
                        desktop: 'square_sm',
                    }}
                    type="copy"
                />
                <Text
                    size={{
                        mobile: 'sm',
                    }}
                >
                    {text}
                </Text>
            </MotionBox>
        </Stack>
    )
}

export function OpenSeaButton({ singleTokenAddress }: { singleTokenAddress: string }) {
    return (
        <Link
            style={{
                display: 'block',
                width: '100%',
            }}
            to={`${openSeaBaseAssetUrl}/${singleTokenAddress}`}
            target="_blank"
            rel="noopenner noreferrer"
        >
            <Stack width="100%" {...buttonStyle}>
                Purchase on OpenSea
                <Icon type="linkOut" />
            </Stack>
        </Link>
    )
}
