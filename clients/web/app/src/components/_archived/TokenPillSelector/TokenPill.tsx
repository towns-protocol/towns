import React from 'react'
import { Box, IconButton, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { splitKeyToContractAddressAndTokenId } from '@components/SpaceSettingsPanel/utils'

type Props = {
    selectionId: string | undefined
    onDelete: ((customKey?: string) => void) | undefined
    selection: Set<string> | undefined
    contractAddressIn?: string
    disableDelete?: boolean
}

/**
 * @deprecated
 */
export function TokenPill(props: Props) {
    const [contractAddress] = props.contractAddressIn
        ? [props.contractAddressIn]
        : splitKeyToContractAddressAndTokenId(props.selectionId ?? '')
    const { data: token } = useTokenMetadataForChainId(contractAddress, 1)

    const tokenIds: number[] = []
    props.selection?.forEach((k) => {
        const [contractAddress, tokenId] = splitKeyToContractAddressAndTokenId(k)
        if (tokenId && token?.data.address === contractAddress) {
            tokenIds.push(+tokenId)
        }
    })

    const deleteAll = () => {
        props.selection?.forEach((k) => {
            const [contractAddress] = splitKeyToContractAddressAndTokenId(k)
            if (token?.data.address === contractAddress) {
                props.onDelete?.(k)
            }
        })
    }

    return (
        <Box
            horizontal
            gap="sm"
            paddingX="sm"
            paddingY="xs"
            background="level3"
            rounded="md"
            alignItems="center"
            data-testid={`token-pill-selector-pill-${contractAddress}`}
        >
            <TokenImage imgSrc="" />
            <>
                <Box
                    display="block"
                    overflow="hidden"
                    whiteSpace="nowrap"
                    style={{
                        textOverflow: 'ellipsis',
                    }}
                    maxWidth="x12"
                >
                    {token?.data.label}
                </Box>
                {contractAddress && (
                    <Box color="gray2" tooltip={contractAddress}>
                        {shortAddress(contractAddress)}
                    </Box>
                )}
                <Box horizontal gap="xs">
                    {tokenIds.map((id) => (
                        <Box
                            centerContent
                            rounded="full"
                            key={id}
                            padding="xs"
                            height="x2"
                            width="x2"
                            background="level1"
                        >
                            <Text size="xs">{id}</Text>
                        </Box>
                    ))}
                </Box>
                {!props.disableDelete && (
                    <IconButton
                        data-testid="token-pill-delete"
                        icon="close"
                        size="square_xs"
                        onClick={deleteAll}
                    />
                )}
            </>
        </Box>
    )
}
