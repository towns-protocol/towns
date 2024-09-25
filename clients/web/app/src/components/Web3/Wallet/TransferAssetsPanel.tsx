import React from 'react'
import { Stack, Text } from '@ui'
import { useIsAAWallet } from './useGetWalletParam'

type Props = {
    //
}

export function TransferAssetsPanel(args: Props) {
    const isAAWallet = useIsAAWallet()

    if (!isAAWallet) {
        return <Text />
    }

    return <Stack position="relative" padding="md" />
}
