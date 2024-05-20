import { Permission } from '@river-build/web3'

enum QuerKeysEnum {
    FirstBySpaceIds = 'spaceIds',
    ThenByRoleIds = 'spaceRoleIds',
    ThenByChannelIds = 'channelIds',
}

// when adding a query, make sure each is unique for the given purpose
// recommended pattern: [queryName, ...queryArgs], where queryArgs goes from generic to specific
// example: ['roles', spaceId, roleId]
export const blockchainKeys = {
    spaceAndChannel: (spaceId: string, channelId: string) => [
        'spacesAndChannels',
        QuerKeysEnum.FirstBySpaceIds,
        spaceId,
        QuerKeysEnum.ThenByChannelIds,
        channelId,
    ],
    hasPermission: (args: {
        spaceId?: string
        channelId?: string
        walletAddress?: string
        permission: Permission
    }) => ['hasPermission', args],
    roles: (spaceId: string) => ['roles', QuerKeysEnum.FirstBySpaceIds, spaceId],
    roleDetails: (spaceId: string, roleId: number) => [
        'rolesDetails',
        QuerKeysEnum.FirstBySpaceIds,
        spaceId,
        QuerKeysEnum.ThenByRoleIds,
        roleId,
    ],
    spaceInfo: (spaceId: string) => ['spaceInfo', QuerKeysEnum.FirstBySpaceIds, spaceId],
    channelInfo: (channelId: string, updatedAtHash: string) => [
        'channelInfo',
        'channelId',
        channelId,
        'updatedAtHash',
        updatedAtHash,
    ],
    // optional roledIds allow for passing only spaceId to get all multipleRoleDetails queries for this space
    multipleRoleDetails: (spaceId: string, roleIds?: number[]) => {
        const queryKey: (string | number[])[] = [
            'multipleRolesDetails',
            QuerKeysEnum.FirstBySpaceIds,
            spaceId,
            QuerKeysEnum.ThenByRoleIds,
        ]
        if (roleIds) {
            queryKey.push(roleIds)
        }
        return queryKey
    },
    entitledChannels: (spaceId: string) => ['syncEntitledChannels', spaceId],
    membershipInfo: (spaceId: string) => ['membershipInfo', spaceId],
    linkedWallets: (walletAddress: string) => ['linkedWallets', walletAddress],
    rootKeyFromLinkedWallet: (walletAddress: string) => ['rootKeyFromLinkedWallet', walletAddress],
    hasMemberNft: (spaceId: string | undefined) => ['hasMemberNft', spaceId ?? 'waitingForSpaceId'],
    walletAddressIsBanned: (walletAddress: string, spaceId: string) => [
        'walletAddressIsBanned',
        walletAddress,
        spaceId,
    ],
    bannedWalletAddresses: (spaceId: string) => ['bannedWalletAddresses', spaceId],
    pricingModules: (chainId: number | undefined) => [
        'pricingModules',
        { chainId: chainId ?? 'waitingForChainId' },
    ],
    supportedXChainIds: () => ['supportedXChainIds'],
}
