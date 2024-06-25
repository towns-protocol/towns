import { EntitlementsDelegate } from '@river-build/encryption'
import { Permission, SpaceDapp } from '@river-build/web3'
import { RiverConfig } from '../../riverConfig'

export class Entitlements implements EntitlementsDelegate {
    constructor(private config: RiverConfig, private spaceDapp: SpaceDapp) {}

    async isEntitled(
        spaceId: string | undefined,
        channelId: string | undefined,
        user: string,
        permission: Permission,
    ) {
        if (this.config.environmentId === 'local_single_ne') {
            return true
        } else if (channelId && spaceId) {
            return this.spaceDapp.isEntitledToChannel(spaceId, channelId, user, permission)
        } else if (spaceId) {
            return this.spaceDapp.isEntitledToSpace(spaceId, user, permission)
        } else {
            return true
        }
    }
}
