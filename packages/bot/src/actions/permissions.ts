import { Permission } from '@towns-protocol/web3'
import { isChannelStreamId, spaceIdFromChannelId } from '@towns-protocol/sdk'
import type { BotClient, ParamsWithoutClient } from './types'

export type HasAdminPermissionParams = ParamsWithoutClient<typeof hasAdminPermission>
export type CheckPermissionParams = ParamsWithoutClient<typeof checkPermission>

export const hasAdminPermission = async (
    client: BotClient,
    userId: string,
    spaceId: string,
): Promise<boolean> => {
    const userAddress = userId.startsWith('0x') ? userId : `0x${userId}`
    // If you can ban, you're probably an "admin"
    return client.spaceDapp
        .isEntitledToSpace(spaceId, userAddress, Permission.ModifyBanning)
        .catch(() => false)
}

export const checkPermission = async (
    client: BotClient,
    streamId: string,
    userId: string,
    permission: Permission,
): Promise<boolean> => {
    const userAddress = userId.startsWith('0x') ? userId : `0x${userId}`
    if (isChannelStreamId(streamId)) {
        const spaceId = spaceIdFromChannelId(streamId)
        return client.spaceDapp
            .isEntitledToChannel(spaceId, streamId, userAddress, permission)
            .catch(() => false)
    } else {
        return client.spaceDapp
            .isEntitledToSpace(streamId, userAddress, permission)
            .catch(() => false)
    }
}
