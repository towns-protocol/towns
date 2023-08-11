import { IChannelShim } from './IChannelShim'
import { IEntitlementsShim } from './IEntitlementsShim'
import { IRolesShim } from './IRolesShim'
import { OwnableFacetShim } from './OwnableFacetShim'
import { TokenPausableFacetShim } from './TokenPausableFacetShim'
import { UNKNOWN_ERROR } from './BaseContractShimV3'
import { ethers } from 'ethers'

export class Town {
    private readonly address: string
    private spaceId: string
    private readonly channels: IChannelShim
    private readonly entitlements: IEntitlementsShim
    private readonly ownable: OwnableFacetShim
    private readonly pausable: TokenPausableFacetShim
    private readonly roles: IRolesShim

    constructor(
        address: string,
        spaceId: string,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
    ) {
        this.address = address
        this.spaceId = spaceId
        this.channels = new IChannelShim(address, chainId, provider)
        this.entitlements = new IEntitlementsShim(address, chainId, provider)
        this.ownable = new OwnableFacetShim(address, chainId, provider)
        this.pausable = new TokenPausableFacetShim(address, chainId, provider)
        this.roles = new IRolesShim(address, chainId, provider)
    }

    public get Address(): string {
        return this.address
    }

    public get SpaceId(): string {
        return this.spaceId
    }

    public get Channels(): IChannelShim {
        return this.channels
    }

    public get Ownable(): OwnableFacetShim {
        return this.ownable
    }

    public get Pausable(): TokenPausableFacetShim {
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
