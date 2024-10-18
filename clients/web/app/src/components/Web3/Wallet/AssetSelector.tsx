import React, { PropsWithChildren, useMemo } from 'react'
import { Address } from 'use-towns-client'
import { useFormContext } from 'react-hook-form'
import { constants } from 'ethers'
import { isDefined } from '@river-build/sdk'
import { Icon, IconButton, Stack, Text } from '@ui'
import { useBalance } from 'hooks/useBalance'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { TokenType } from '@components/Tokens/types'
import { TokenSelection } from '@components/Tokens/TokenSelector/TokenSelection'
import { TransferSchema } from './transferAssetsSchema'
import { SingleSelectionSelector } from './SingleSelectionSelector'

export const ETH_OPTION = {
    chainId: 0o0,
    data: {
        address: constants.AddressZero,
        type: TokenType.UNKNOWN,
        label: 'BASE ETH',
        tokenId: '0',
    },
}

export function AssetSelector(props: {
    fromWallet: Address | undefined
    fromBalance: ReturnType<typeof useBalance>['data']
    nfts: Token[]
}) {
    const { fromBalance, nfts } = props
    const { watch, setValue } = useFormContext<TransferSchema>()
    const assetToTransfer = watch('assetToTransfer')

    const options: Token[] = useMemo(() => {
        return [ETH_OPTION, ...nfts].filter((asset) => isDefined(asset.data.address))
    }, [nfts])

    const onAddItem = (token: Token) => {
        const isEth = token.data.address === ETH_OPTION.data.address
        setValue('assetToTransfer', isEth ? 'BASE_ETH' : (token.data.address as Address))
        setValue('tokenId', isEth ? undefined : token.data.tokenId)
    }

    const singleSelection = (removeCb: () => void) => {
        const onRemoveClick = () => {
            setValue('assetToTransfer', undefined)
            removeCb()
        }
        if (assetToTransfer === 'BASE_ETH') {
            return (
                <AssetToTransfer onRemoveClick={onRemoveClick}>
                    <EthDetail fromBalance={fromBalance} />
                </AssetToTransfer>
            )
        } else if (assetToTransfer) {
            const asset = options.find((t) => t.data.address === assetToTransfer)
            if (!asset) {
                return <>not found</>
            }
            return (
                <AssetToTransfer onRemoveClick={onRemoveClick}>
                    <TokenSelection
                        token={asset}
                        wrapperBoxProps={{ paddingY: 'none', paddingX: 'none' }}
                    />
                </AssetToTransfer>
            )
        }
    }

    return (
        <Stack gap data-testid="asset-search">
            <SingleSelectionSelector
                options={options}
                label="Search Assets"
                placeholder="Search Assets"
                keys={['data.address', 'data.tokenId', 'data.name', 'data.label']}
                optionRenderer={(args) => (
                    <AssetOption token={args.option} onAddItem={() => onAddItem(args.option)} />
                )}
                getOptionKey={(opt) => opt?.data?.address + opt?.data?.tokenId}
                singleSelection={(onRemoveClick) => singleSelection(onRemoveClick)}
            />
        </Stack>
    )
}

function AssetToTransfer(
    props: PropsWithChildren & {
        onRemoveClick: () => void
    },
) {
    return (
        <Stack
            horizontal
            padding
            rounded="sm"
            background="level2"
            justifyContent="spaceBetween"
            alignItems="center"
            data-testid="asset-to-transfer"
        >
            {props.children}
            <IconButton
                data-testid="remove-asset"
                icon="close"
                tooltip="Unselect"
                onClick={props.onRemoveClick}
            />
        </Stack>
    )
}

function AssetOption(props: { token: Token; onAddItem: (customKey?: string) => void }) {
    const { token, onAddItem } = props

    const onClick = () => {
        onAddItem(token.data.address)
    }

    if (token.data.address === ETH_OPTION.data.address) {
        return <EthOption onAddItem={onClick} />
    }

    return (
        <Stack
            cursor="pointer"
            data-testid={`asset-option-${token.data.address}`}
            onClick={() => onAddItem(token.data.address)}
        >
            <TokenSelection token={token} wrapperBoxProps={{ paddingY: 'sm', hoverable: true }} />
        </Stack>
    )
}

function EthOption(props: { onAddItem: () => void; address?: Address }) {
    const { onAddItem } = props

    return (
        <Stack
            hoverable
            cursor="pointer"
            padding="sm"
            rounded="sm"
            background="level2"
            data-testid="asset-option-eth"
            onClick={onAddItem}
        >
            <EthDetail />
        </Stack>
    )
}

export function EthDetail(props: { fromBalance?: ReturnType<typeof useBalance>['data'] }) {
    const { fromBalance } = props
    return (
        <Stack horizontal alignItems="center" gap="sm">
            <Icon type="base" size="square_x5" />
            <Stack gap="sm">
                <Text>{fromBalance ? fromBalance.formatted : ''} ETH</Text>
                <Text size="sm" color="gray2">
                    Base
                </Text>
            </Stack>
        </Stack>
    )
}
