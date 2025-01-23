import React, { useMemo } from 'react'
import { Address } from 'use-towns-client'
import { useFormContext } from 'react-hook-form'
import { isAddress } from 'ethers/lib/utils'
import { Icon, Stack, Text } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useBalance } from 'hooks/useBalance'
import { shortAddress } from 'ui/utils/utils'
import { WalletWithBalance } from './WalletWithBalance'
import { TransferSchema } from './transferAssetsSchema'
import { SingleSelectionSelector } from './SingleSelectionSelector'

const LINK_WALLET = 'Link Wallet' as const

export function WalletSelector(props: {
    aaAddress?: Address
    fromWallet?: Address
    linkedWallets: string[] | undefined
}) {
    const { aaAddress, fromWallet, linkedWallets } = props
    const { watch, setValue } = useFormContext<TransferSchema>()
    const recipient = watch('recipient')

    const _wallets: { address: Address | typeof LINK_WALLET }[] = useMemo(() => {
        return (
            linkedWallets
                ?.filter((w) => w.toLowerCase() !== fromWallet?.toLowerCase())
                .map((w) => ({ address: w as Address })) ?? []
        )
    }, [fromWallet, linkedWallets])

    const label = _wallets.length === 0 ? 'No linked wallets' : 'Linked Wallets'
    const options = _wallets.concat([{ address: LINK_WALLET }])

    const onAddItem = (address: Address | typeof LINK_WALLET) => {
        if (address === LINK_WALLET) {
            return
        }
        setValue('recipient', address)
    }

    const singleSelection = (removeCb: () => void) => {
        const onRemoveClick = () => {
            setValue('recipient', undefined)
            removeCb()
        }

        if (!recipient) {
            return
        }
        const isAAWallet = aaAddress?.toLowerCase() === recipient.toLowerCase()

        return (
            <Stack padding background="level2" rounded="sm" data-testid="selected-wallet">
                <WalletWithBalance
                    address={recipient}
                    isAbstractAccount={isAAWallet}
                    onRemoveClick={onRemoveClick}
                />
            </Stack>
        )
    }

    return (
        <Stack gap data-testid="linked-wallet-search">
            <SingleSelectionSelector
                options={options}
                label={label}
                placeholder="Choose linked wallet or enter Base address (0x)"
                keys={['address']}
                optionRenderer={(args) => (
                    <WalletsOption
                        address={args.option.address}
                        aaAddress={aaAddress}
                        onAddItem={() => onAddItem(args.option.address)}
                    />
                )}
                emptySelectionElement={(props) => (
                    <EmptyWalletOption
                        searchTerm={props.searchTerm}
                        onAddItem={(address) => onAddItem(address)}
                    />
                )}
                getOptionKey={(opt) => opt.address}
                singleSelection={(onRemoveClick) => singleSelection(onRemoveClick)}
            />
        </Stack>
    )
}

function EmptyWalletOption(props: {
    searchTerm: string
    onAddItem: (searchItem: Address) => void
}) {
    const { openPanel } = usePanelActions()

    const onLinkWallet = () => {
        openPanel('wallets')
    }
    return (
        <Stack padding gap rounded="sm" background="level2" boxShadow="card">
            {isAddress(props.searchTerm) ? (
                <WalletsOption
                    address={props.searchTerm}
                    onAddItem={() => props.onAddItem(props.searchTerm as Address)}
                />
            ) : (
                <Stack horizontal alignItems="center" gap="sm" color="gray2">
                    <Icon type="alert" size="square_sm" />
                    <Text>Enter a valid Base address</Text>
                </Stack>
            )}
            <Stack
                horizontal
                paddingY="xs"
                cursor="pointer"
                justifyContent="spaceBetween"
                onClick={onLinkWallet}
            >
                <Text>{LINK_WALLET}</Text>
            </Stack>
        </Stack>
    )
}

function WalletsOption(props: {
    address: string
    onAddItem: (customKey?: string) => void
    aaAddress?: Address
}) {
    const { address, onAddItem, aaAddress } = props
    const { openPanel } = usePanelActions()
    const balance = useBalance({
        address: address as Address,
        enabled: address !== LINK_WALLET,
        watch: true,
    })
    const onClick = () => {
        if (address !== LINK_WALLET) {
            onAddItem(address)
        } else {
            openPanel('wallets')
        }
    }

    const isAAWallet = aaAddress?.toLowerCase() === address.toLowerCase()

    return (
        <Stack
            horizontal
            paddingBottom="sm"
            rounded="sm"
            cursor="pointer"
            justifyContent="spaceBetween"
            data-testid={`linked-wallet-option-${address}`}
            onClick={onClick}
        >
            <Stack gap="sm">
                {isAAWallet && <Text>Towns Wallet</Text>}
                <Text color={isAAWallet ? 'gray2' : 'gray1'} size={isAAWallet ? 'xs' : 'md'}>
                    {address === LINK_WALLET ? LINK_WALLET : shortAddress(address)}
                </Text>
            </Stack>
            {address !== LINK_WALLET && (
                <Stack horizontal gap="sm">
                    {balance.data?.formatted ?? 0} {balance.data?.symbol ?? ''}
                    <Icon type="base" size="square_sm" />
                </Stack>
            )}
        </Stack>
    )
}
