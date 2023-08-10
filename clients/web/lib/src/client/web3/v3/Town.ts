import { UNKNOWN_ERROR } from './BaseContractShimV3'
import { IChannelShim } from './IChannelShim'
import { IEntitlementsShim } from './IEntitlementsShim'
import { IPausableShim } from './IPausableShim'
import { IRolesShim } from './IRolesShim'
import { ethers } from 'ethers'

export class Town {
    private readonly channels: IChannelShim
    private readonly entitlements: IEntitlementsShim
    private readonly pausable: IPausableShim
    private readonly roles: IRolesShim

    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        this.channels = new IChannelShim(address, chainId, provider)
        this.pausable = new IPausableShim(address, chainId, provider)
        this.entitlements = new IEntitlementsShim(address, chainId, provider)
        this.roles = new IRolesShim(address, chainId, provider)
    }

    public get Channels(): IChannelShim {
        return this.channels
    }

    public get Pausable(): IPausableShim {
        return this.pausable
    }

    public get Roles(): IRolesShim {
        return this.roles
    }

    public get Entitlements(): IEntitlementsShim {
        return this.entitlements
    }

    public parseError(error: unknown): Error {
        // try each of the contracts to see who can give the best error message
        let err = this.channels.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        err = this.pausable.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        err = this.entitlements.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        err = this.roles.parseError(error)
        if (err?.name !== UNKNOWN_ERROR) {
            return err
        }
        return err
    }
}
