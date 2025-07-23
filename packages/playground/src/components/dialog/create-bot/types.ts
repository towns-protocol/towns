import { type Address, Permission } from '@towns-protocol/web3'

export interface BotFormData {
    name: string
    description: string
    permissions: Permission[]
    installPrice: string
    membershipDuration: string
    botKind: 'simple' | 'contract'
    contractAddress?: Address
    imageUrl?: string
    avatarUrl?: string
}
