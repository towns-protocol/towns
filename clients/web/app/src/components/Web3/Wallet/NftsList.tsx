import React from 'react'
import { Address } from 'use-towns-client'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { Stack } from '@ui'
import { VList } from 'ui/components/VList2/VList'
import { TokenSelectionDisplay } from '@components/Tokens/TokenSelector/TokenSelection'
import { useBaseNftsForTransfer } from './useBaseNftsForTransfer'

export function NftsList({ walletAddress }: { walletAddress: Address | undefined }) {
    const { nfts, isFetching } = useBaseNftsForTransfer(walletAddress)

    if (isFetching) {
        return <ButtonSpinner />
    }

    return (
        <Stack height="100%" position="relative">
            <VList
                getItemKey={(item) => item.data.address}
                align="top"
                list={nfts}
                estimateHeight={() => 75}
                itemRenderer={(data) => <VListItem token={data} />}
            />
        </Stack>
    )
}

function VListItem({ token }: { token: Token }) {
    return (
        <Stack paddingBottom="md">
            <TokenSelectionDisplay token={token} />
        </Stack>
    )
}
