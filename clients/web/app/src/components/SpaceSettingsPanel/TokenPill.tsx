import React from 'react'
import { Box, IconButton, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { FetchedTokenAvatar } from '@components/Tokens/FetchedTokenAvatar'
import { useTokenMetadata } from 'api/lib/collectionMetadata'
import { splitKeyToContractAddressAndTokenId } from './utils'

type Props = {
    selectionId: string
    onDelete: (customKey?: string) => void
    selection: Set<string>
}

export function TokenPill(props: Props) {
    const [contractAddress] = splitKeyToContractAddressAndTokenId(props.selectionId)
    const { data: token } = useTokenMetadata(contractAddress)

    const tokenIds: number[] = []
    props.selection.forEach((k) => {
        const [contractAddress, tokenId] = splitKeyToContractAddressAndTokenId(k)
        if (tokenId && token?.contractAddress === contractAddress) {
            tokenIds.push(+tokenId)
        }
    })

    const deleteAll = () => {
        props.selection.forEach((k) => {
            const [contractAddress] = splitKeyToContractAddressAndTokenId(k)
            if (token?.contractAddress === contractAddress) {
                props.onDelete(k)
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
            <FetchedTokenAvatar
                noLabel
                address={contractAddress}
                size="avatar_xs"
                layoutProps={{
                    rounded: 'xs',
                    background: 'negative',
                    padding: 'none',
                    // background: 'none',
                }}
                avatarToggleClasses={{
                    square: true,
                    noBg: true,
                }}
                tokenIds={[]}
            />
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
                    {token?.label}
                </Box>
                {token?.contractAddress && (
                    <Box color="gray2" tooltip={token.contractAddress}>
                        {shortAddress(token.contractAddress)}
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
                <IconButton
                    data-testid="token-pill-delete"
                    icon="close"
                    size="square_xs"
                    onClick={deleteAll}
                />
            </>
        </Box>
    )
}
