import { ContractMetadata } from '@token-worker/types'
import React from 'react'
import { RoomIdentifier } from 'use-zion-client'
import { Box, Text } from '@ui'
import { useRoleTokensMetatdata } from 'api/lib/collectionMetadata'
import { env } from 'utils'
import { TokenAvatar } from './TokenAvatar'

export function TokenCheckboxLabel(props: {
    spaceId: RoomIdentifier
    tokenAddresses: string[]
    label: string
}): JSX.Element {
    const { data, errors } = useRoleTokensMetatdata(props.spaceId, props.tokenAddresses)
    return (
        <Box>
            <Box>{props.label}</Box>

            {!data ? (
                <Box visibility="hidden">
                    <TokenAvatar size="avatar_md" contractAddress="" />
                </Box>
            ) : !data.length ? null : (
                <Box horizontal gap="lg" paddingTop="md">
                    {data
                        .filter((token): token is ContractMetadata => !!token)
                        .map((token) => {
                            return (
                                <TokenAvatar
                                    key={token.address}
                                    contractAddress={token.address ?? ''}
                                    imgSrc={token.imageUrl}
                                    size="avatar_md"
                                    label={token.name}
                                />
                            )
                        })}
                </Box>
            )}

            {env.IS_DEV && errors.length ? (
                <Box color="negative" maxWidth="400">
                    <Text size="sm">
                        DEV message: If you are not seeing token display data here, the Alchemy NFT
                        API call failed. Usually this indicates 1 of 2 things:
                        <br />
                        <br />
                        1. that you created this town with tokens from goerli, but you are pointed
                        to local homeserver, so you need to append ?goerli to url to get the data to
                        show up
                        <br />
                        <br />
                        2. that you created this town with a Foundry asset, using an Anvil account -
                        i.e. the zion token - and making it show up here requires more work yet to
                        be done
                        <br />
                        <br />
                        In either case, this is just display data and you can still create a channel
                    </Text>
                </Box>
            ) : null}
        </Box>
    )
}
