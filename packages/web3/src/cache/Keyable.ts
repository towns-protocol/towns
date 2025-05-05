import { ethers } from 'ethers'
import { Permission } from '../types/ContractTypes'
export interface Keyable {
    toKey(): string
}

export class BannedTokenIdsRequest implements Keyable {
    spaceId: string
    constructor(spaceId: string) {
        this.spaceId = spaceId
    }
    toKey(): string {
        return `bannedTokenIds:${this.spaceId}`
    }
}

export class OwnerOfTokenRequest implements Keyable {
    spaceId: string
    tokenId: ethers.BigNumber
    constructor(spaceId: string, tokenId: ethers.BigNumber) {
        this.spaceId = spaceId
        this.tokenId = tokenId
    }
    toKey(): string {
        return `ownerOfToken:${this.spaceId}:${this.tokenId.toString()}`
    }
}

export class IsTokenBanned implements Keyable {
    spaceId: string
    tokenId: ethers.BigNumber
    constructor(spaceId: string, tokenId: ethers.BigNumber) {
        this.spaceId = spaceId
        this.tokenId = tokenId
    }
    toKey(): string {
        return `isBanned:${this.spaceId}:${this.tokenId.toString()}`
    }
}

export class EntitlementRequest implements Keyable {
    spaceId: string
    channelId: string
    userId: string
    permission: Permission
    constructor(spaceId: string, channelId: string, userId: string, permission: Permission) {
        this.spaceId = spaceId
        this.channelId = channelId
        this.userId = userId
        this.permission = permission
    }
    toKey(): string {
        return `{spaceId:${this.spaceId},channelId:${this.channelId},userId:${this.userId},permission:${this.permission}}`
    }
}
