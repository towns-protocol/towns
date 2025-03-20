import { UserOps } from '../src/UserOperations'
import { LOCALHOST_CHAIN_ID } from '@towns-protocol/web3'

export class TestUserOps extends UserOps {
    private isAnvil() {
        return this.spaceDapp?.config.chainId === LOCALHOST_CHAIN_ID
    }

    public createLegacySpaces() {
        return process.env.CREATE_LEGACY_SPACES === 'true'
    }
}
