import { Permission } from '@river/web3'

enum QuerKeysEnum {
    FirstBySpaceIds = 'spaceIds',
    ThenByRoleIds = 'spaceRoleIds',
    ThenByChannelIds = 'channelIds',
    SyncEntitledChannels = 'syncEntitledChannels',
}

export const blockchainKeys = {
    spaceAndChannel: (spaceId: string, channelId: string) =>
        [QuerKeysEnum.FirstBySpaceIds, spaceId, QuerKeysEnum.ThenByChannelIds, channelId] as const,
    hasPermission: (args: {
        spaceId?: string
        channelId?: string
        walletAddress: string
        permission: Permission
    }) => ['hasPermission', args] as const,
    roles: (spaceId: string) => [QuerKeysEnum.FirstBySpaceIds, spaceId] as const,
    roleDetails: (spaceId: string, roleId: number) =>
        [QuerKeysEnum.FirstBySpaceIds, spaceId, QuerKeysEnum.ThenByRoleIds, roleId] as const,
    multipleRoleDetails: (spaceId: string, roleIds?: number[]) =>
        roleIds
            ? ([
                  QuerKeysEnum.FirstBySpaceIds,
                  spaceId,
                  QuerKeysEnum.ThenByRoleIds,
                  roleIds,
              ] as const)
            : ([QuerKeysEnum.FirstBySpaceIds, spaceId, QuerKeysEnum.ThenByRoleIds] as const),
    entitledChannels: (spaceId?: string) =>
        spaceId
            ? ([QuerKeysEnum.SyncEntitledChannels, spaceId] as const)
            : ([QuerKeysEnum.SyncEntitledChannels] as const),
}
