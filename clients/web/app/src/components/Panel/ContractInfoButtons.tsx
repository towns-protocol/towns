import React from 'react'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { IconButton, Stack } from '@ui'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { shortAddress } from 'ui/utils/utils'
import { baseScanUrl, openSeaAssetUrl } from '@components/Web3/utils'

export const ContractInfoButtons = ({
    contractAddress,
    ownerAddress,
    nft,
}: {
    contractAddress: string
    ownerAddress?: string
    nft?: `0x${string}/${number}`
}) => {
    const { baseChain } = useEnvironment()
    const chainId = baseChain.id

    const clipboardAddress = ownerAddress || contractAddress
    const openSeaUrl = openSeaAssetUrl(chainId, nft || contractAddress)

    return (
        <Stack horizontal gap="sm">
            <ClipboardCopy
                label={shortAddress(clipboardAddress)}
                clipboardContent={clipboardAddress}
            />
            <Stack horizontal centerContent gap="sm" height="paragraph">
                <IconButton
                    padding="none"
                    insetY="xxs"
                    size="square_xs"
                    icon="etherscan"
                    tooltip="Open Contract details"
                    onClick={() => {
                        window.open(
                            `${baseScanUrl(chainId)}/address/${contractAddress}`,
                            '_blank',
                            'noopener,noreferrer',
                        )
                    }}
                />

                <IconButton
                    padding="none"
                    insetY="xxs"
                    size="square_xs"
                    icon="openSeaPlain"
                    tooltip="View on OpenSea"
                    onClick={() => {
                        window.open(openSeaUrl, '_blank', 'noopener,noreferrer')
                    }}
                />
            </Stack>
        </Stack>
    )
}
