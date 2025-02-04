import React from 'react'
import { ConnectedWallet, useWallets } from '@privy-io/react-auth'
import { useSetActiveWallet } from '@privy-io/wagmi'
import { Icon } from 'ui/components/Icon/Icon'
import { Button, Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ConnectedWalletIcon } from './ConnectedWalletIcon'

export function SelectDifferentWallet() {
    const { wallets } = useWallets()
    const { setActiveWallet } = useSetActiveWallet()
    const nonPrivyWallets = wallets.filter((w) => w.walletClientType !== 'privy')

    const handleSetActiveWallet = (wallet: ConnectedWallet) => {
        setActiveWallet(wallet)
    }

    return (
        <Stack gap="lg" alignItems="center">
            <Icon size="square_xl" type="baseEth" />
            <Text>Please select the wallet you want to use to fund your account.</Text>
            {nonPrivyWallets.map((w) => (
                <Button
                    width="100%"
                    rounded="full"
                    key={w.address}
                    onClick={() => handleSetActiveWallet(w)}
                >
                    <ConnectedWalletIcon walletName={w.walletClientType} />
                    {shortAddress(w.address)}
                </Button>
            ))}
        </Stack>
    )
}

export function useNonPrivyWallets() {
    const { wallets } = useWallets()
    const nonPrivyWallets = wallets.filter((w) => w.walletClientType !== 'privy')
    return nonPrivyWallets
}
