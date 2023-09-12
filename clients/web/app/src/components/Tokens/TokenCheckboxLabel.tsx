import React from 'react'
import { RoleDetails, RoomIdentifier } from 'use-zion-client'
import { BigNumber } from 'ethers'
import { Box } from '@ui'
import { FetchedTokenAvatar } from './FetchedTokenAvatar'

type Tokens = RoleDetails['tokens']

export function TokenCheckboxLabel(props: {
    spaceId: RoomIdentifier
    tokens: Tokens | undefined
    label: string
}): JSX.Element {
    return (
        <Box>
            <Box>{props.label}</Box>
            {props.tokens && props.tokens.length > 0 && (
                <Box horizontal gap="lg" paddingTop="md">
                    {props.tokens?.map((t) => {
                        const address = t.contractAddress as string
                        const tokenIds = t.tokenIds.map((t) => (t as BigNumber).toNumber())
                        return (
                            <FetchedTokenAvatar
                                key={address}
                                address={address}
                                tokenIds={tokenIds}
                            />
                        )
                    })}
                </Box>
            )}
        </Box>
    )
}
