import React from 'react'
import { Icon, IconName } from 'ui/components/Icon/Icon'

const iconMap: Record<string, IconName> = {
    metamask: 'metamask',
}
export function ConnectedWalletIcon({ walletName }: { walletName: string | undefined }) {
    return <Icon type={iconMap[walletName ?? ''] ?? 'wallet'} />
}
