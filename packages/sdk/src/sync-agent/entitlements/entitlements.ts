import { EntitlementsDelegate } from '../../decryptionExtensions'
import { Permission, SpaceDapp } from '@towns-protocol/web3'
import { RiverConfig } from '../../townsEnv'

export class Entitlements implements EntitlementsDelegate {
    constructor(
        private config: RiverConfig,
        private spaceDapp: SpaceDapp,
    ) {}

    async isEntitled(
        spaceId: string | undefined,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ) {
        if (channelId && spaceId) {
            return this.spaceDapp.isEntitledToChannel(spaceId, channelId, user, permission)
        } else if (spaceId) {
            return this.spaceDapp.isEntitledToSpace(spaceId, user, permission)
        } else {
            return true
        }
    }
}
