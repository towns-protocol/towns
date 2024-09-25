import React, { useMemo } from 'react'
import { Address } from 'use-towns-client'
import { Box, Icon, Stack, Text } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { PanelButton } from '@components/Panel/PanelButton'
import { useBalance } from 'hooks/useBalance'
import { useNfts } from 'hooks/useNfts'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { TokenSelectionDisplay } from '@components/Tokens/TokenSelector/TokenSelection'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { VList } from 'ui/components/VList2/VList'
import { useGetWalletParam, useIsAAWallet } from './useGetWalletParam'

export function SingleWalletPanel() {
    const isAAWallet = useIsAAWallet()
    const walletAddress = useGetWalletParam()

    const balance = useBalance({
        address: walletAddress || undefined,
        watch: true,
    })
    const baseChainId = useEnvironment().baseChain.id

    if (!isAAWallet) {
        return <></>
    }

    const title = isAAWallet ? 'Towns Wallet' : ''

    return (
        <Panel label={title}>
            {/* <PanelButton cursor="pointer">
                <Icon type="linkOutWithFrame" size="square_sm" color="gray2" />
                <Text strong>Transfer Asset</Text>
            </PanelButton> */}
            <PanelButton hoverable={false} as="div" cursor="auto" height="auto">
                <Box width="height_md" alignItems="center">
                    <Icon type="base" size="square_lg" />
                </Box>
                <Box gap="sm">
                    <Text>
                        {balance.data?.formatted ?? 0} {balance.data?.symbol ?? ''}
                    </Text>
                    <Text size="sm" color="gray2">
                        Base
                    </Text>
                </Box>
            </PanelButton>
            <Nfts baseChainId={baseChainId} walletAddress={walletAddress} />
        </Panel>
    )
}

function Nfts({
    baseChainId,
    walletAddress,
}: {
    baseChainId: number
    walletAddress: Address | undefined
}) {
    const { nfts, isFetching } = useNfts(walletAddress)

    const _nfts = useMemo(() => {
        return nfts
            .filter((nft) => nft.chainId === baseChainId)
            .map((nft) => {
                const transformed: Token = {
                    ...nft,
                    data: {
                        ...nft.data,
                        openSeaCollectionUrl: nft.data.openSeaCollectionUrl ?? undefined,
                        quantity: nft.data.quantity?.toString() ?? undefined,
                        tokenId: nft.data.tokenId?.toString() ?? undefined,
                    },
                }
                return transformed
            })
    }, [nfts, baseChainId])

    if (isFetching) {
        return <ButtonSpinner />
    }

    return (
        <Stack height="100%" position="relative">
            <VList
                getItemKey={(item) => item.data.address}
                align="top"
                list={_nfts}
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
