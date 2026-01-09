import { ethers } from 'ethers'
import { Permission } from '../types/ContractTypes'

export class Keyable {
    private readonly parts: unknown[]

    constructor(...args: unknown[]) {
        this.parts = args
    }

    toKey(): string {
        return this.parts
            .map((part) => {
                if (part === null) return 'null'
                if (part === undefined) return 'undefined'
                if (ethers.BigNumber.isBigNumber(part)) {
                    return part.toString()
                }
                if (typeof part === 'object') {
                    return JSON.stringify(part)
                }
                // At this point, part is a primitive (string, number, boolean, bigint, symbol)
                return String(part as string | number | boolean | bigint | symbol)
            })
            .join(':')
    }

    static spaceInfo(spaceId: string): Keyable {
        return new Keyable('spaceInfo', spaceId)
    }

    static getEntitlements(spaceAddress: string): Keyable {
        return new Keyable('getEntitlements', spaceAddress)
    }

    static owner(spaceAddress: string): Keyable {
        return new Keyable('owner', spaceAddress)
    }

    static balanceOf(accountAddress: string): Keyable {
        return new Keyable('balanceOf', accountAddress)
    }

    static bannedTokenIds(spaceId: string): Keyable {
        return new Keyable('bannedTokenIds', spaceId)
    }

    static ownerOfToken(spaceId: string, tokenId: ethers.BigNumber): Keyable {
        return new Keyable('ownerOfToken', spaceId, tokenId)
    }

    static isTokenBanned(spaceId: string, tokenId: ethers.BigNumber): Keyable {
        return new Keyable('isTokenBanned', spaceId, tokenId)
    }

    static entitlement(
        spaceId: string,
        channelId: string,
        userId: string,
        permission: Permission,
    ): Keyable {
        return new Keyable('entitlement', spaceId, channelId, userId, permission)
    }

    static spaceEntitlement(spaceId: string, permission: Permission): Keyable {
        return new Keyable('spaceEntitlement', spaceId, permission)
    }

    static spaceEntitlementEvaluation(
        spaceId: string,
        rootKey: string,
        permission: Permission,
    ): Keyable {
        return new Keyable('spaceEntitlementEval', spaceId, rootKey, permission)
    }

    static channelEntitlement(spaceId: string, channelId: string, permission: Permission): Keyable {
        return new Keyable('channelEntitlement', spaceId, channelId, permission)
    }

    static channelEntitlementEvaluation(
        spaceId: string,
        channelNetworkId: string,
        userId: string,
        permission: Permission,
    ): Keyable {
        return new Keyable('channelEntitlementEval', spaceId, channelNetworkId, userId, permission)
    }
}
