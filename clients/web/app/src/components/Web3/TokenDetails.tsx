import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useResizeObserver from '@react-hook/resize-observer'
import { Icon, Stack, Text } from '@ui'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { TokenEntitlement } from '@components/Tokens/TokenSelector/tokenSchemas'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { NetworkName } from '@components/Tokens/TokenSelector/NetworkName'

export function TokenDetails(props: { token: TokenEntitlement; userOwnsToken?: boolean }) {
    const { token, userOwnsToken } = props
    const { data: tokenDataWithChainId } = useTokenMetadataForChainId(token.address, token.chainId)
    const [compactView, setCompactView] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useResizeObserver(containerRef, () => {
        if (containerRef.current) {
            setCompactView(containerRef.current.clientWidth < 340)
        }
    })

    return (
        <Stack
            horizontal
            ref={containerRef}
            gap="sm"
            padding="sm"
            rounded="md"
            background="level3"
            alignItems={compactView ? 'start' : 'center'}
        >
            <TokenImage imgSrc={tokenDataWithChainId?.data.imgSrc} width="x4" />
            <Stack horizontal grow gap="sm" alignItems="center" flexWrap="wrap">
                <Stack grow gap="sm">
                    <Stack horizontal gap="sm" alignItems="center">
                        <Text>{tokenDataWithChainId?.data.label}</Text>
                        {userOwnsToken !== undefined && (
                            <Icon
                                type={userOwnsToken ? 'check' : 'close'}
                                color={userOwnsToken ? 'positive' : 'negative'}
                                size="square_xs"
                            />
                        )}
                    </Stack>
                    <Stack
                        horizontal={!compactView}
                        alignItems={compactView ? 'start' : 'center'}
                        gap="sm"
                    >
                        <ClipboardCopy clipboardContent={token.address}>
                            <Text size="sm" color="gray2">
                                {shortAddress(token.address)}
                            </Text>
                        </ClipboardCopy>
                        {!compactView && <>&#x2022;</>}
                        <Stack horizontal centerContent gap="sm">
                            <NetworkName chainId={token.chainId} size="sm" />
                            {tokenDataWithChainId?.data.openSeaCollectionUrl && (
                                <Link
                                    to={tokenDataWithChainId?.data.openSeaCollectionUrl}
                                    rel="noopener noreffer"
                                    target="_blank"
                                >
                                    <Icon type="openSeaPlain" color="gray2" size="square_xs" />
                                </Link>
                            )}
                        </Stack>
                    </Stack>
                </Stack>
                <Stack>
                    <Stack
                        horizontal
                        color="gray2"
                        padding="sm"
                        rounded="sm"
                        background="level4"
                        alignItems="center"
                    >
                        <Text
                            size={{
                                mobile: 'sm',
                            }}
                        >
                            QTY: {token.quantity}
                        </Text>
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    )
}
