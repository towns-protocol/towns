import { BigNumber, ContractTransaction, ethers } from 'ethers'
import {
    Channel,
    EntitlementModule,
    EntitlementModuleType,
    Permission,
    RoleDetails,
} from './ContractTypes'
import { EventsContractInfo, ISpaceDapp, UpdateChannelParams, UpdateRoleParams } from './ISpaceDapp'
import { IStaticContractsInfo, getContractsInfo } from './IStaticContractsInfo'
import { SpaceDataTypes, SpaceShim } from './shims/SpaceShim'
import { SpaceFactoryDataTypes, SpaceFactoryShim } from './shims/SpaceFactoryShim'
import { TokenDataTypes, TokenEntitlementShim } from './shims/TokenEntitlementShim'
import {
    createTokenEntitlementStruct,
    createUserEntitlementStruct,
    decodeExternalTokens,
    decodeUsers,
} from './ContractHelpers'

import { ShimFactory } from './shims/ShimFactory'
import { SpaceInfo } from './SpaceInfo'
import { UserEntitlementShim } from './shims/UserEntitlementShim'
import { BytesLike, keccak256 } from 'ethers/lib/utils'
import { toUtf8Bytes } from '@ethersproject/strings'

interface Spaces {
    [spaceId: string]: SpaceShim
}

interface EntitlementShims {
    tokenEntitlement: TokenEntitlementShim | undefined
    userEntitlement: UserEntitlementShim | undefined
}

interface EntitlementData {
    tokens: TokenDataTypes.ExternalTokenStruct[]
    users: string[]
}

export class SpaceDapp implements ISpaceDapp {
    private readonly chainId: number
    private readonly spaceFactory: SpaceFactoryShim
    private readonly spaces: Spaces = {}
    private readonly contractsInfo: IStaticContractsInfo
    private readonly provider: ethers.providers.Provider | undefined
    private readonly signer: ethers.Signer | undefined

    constructor(
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
    ) {
        this.chainId = chainId
        this.provider = provider
        this.signer = signer
        this.contractsInfo = getContractsInfo(chainId)
        this.spaceFactory = new SpaceFactoryShim(
            this.contractsInfo.spaceFactory.address.spaceFactory,
            this.contractsInfo.spaceFactory.abi,
            chainId,
            provider,
            signer,
        )
    }

    public async createSpace(
        spaceName: string,
        spaceNetworkId: string,
        spaceMetadata: string,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
    ): Promise<ContractTransaction> {
        if (!this.spaceFactory.write) {
            throw new Error('SpaceFactory write contract is not deployed properly.')
        }
        return this.spaceFactory.write.createSpace(
            spaceName,
            spaceNetworkId,
            spaceMetadata,
            everyonePermissions,
            memberEntitlements,
        )
    }

    public async createChannel(
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.write.createChannel(channelName, channelNetworkId, roleIds)
    }

    public async createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.read || !space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }

        // figure out the addresses for each entitlement module
        const entitlementModules = await space.getEntitlementModules()
        let tokenModuleAddress = ''
        let userModuleAddress = ''
        for (const module of entitlementModules) {
            switch (module.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    tokenModuleAddress = module.address
                    break
                case EntitlementModuleType.UserEntitlement:
                    userModuleAddress = module.address
                    break
            }
        }
        if (tokens.length && !tokenModuleAddress) {
            throw new Error('Token entitlement moodule address not found.')
        }
        if (users.length && !userModuleAddress) {
            throw new Error('User entitlement moodule address not found.')
        }

        // create the entitlements array
        const entitlements: SpaceDataTypes.EntitlementStruct[] = []
        if (tokens.length) {
            // create the token entitlement
            const tokenEntitlement = createTokenEntitlementStruct(tokenModuleAddress, tokens)
            entitlements.push(tokenEntitlement)
        }
        // create the user entitlement
        if (users.length) {
            const userEntitlement = createUserEntitlementStruct(userModuleAddress, users)
            entitlements.push(userEntitlement)
        }
        // create the role
        return space.write.createRole(roleName, permissions, entitlements)
    }

    public async getSpace(spaceId: string, requireSigner = true): Promise<SpaceShim | undefined> {
        if (!this.provider || (requireSigner && !this.signer)) {
            throw new Error('Provider or signer is not set.')
        }
        if (!this.spaces[spaceId]) {
            const hash = keccak256(toUtf8Bytes(spaceId))
            const spaceAddress = await this.spaceFactory.read?.spaceByHash(hash)
            if (!spaceAddress || spaceAddress === ethers.constants.AddressZero) {
                return undefined // space is not found
            }
            const abi = ShimFactory.getSpaceAbi(this.chainId, spaceId)
            this.spaces[spaceId] = new SpaceShim(
                spaceAddress,
                abi,
                this.chainId,
                this.provider,
                this.signer,
            )
        }
        return this.spaces[spaceId]
    }

    public async addRoleToChannel(
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
    ): Promise<ContractTransaction> {
        const encodedCallData: BytesLike[] = []
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        const entitlementShims = await this.createEntitlementShims(space)
        const entitlementDetails = await this.getEntitlementDetails(space, entitlementShims, roleId)
        let userEntitlement: string | undefined
        let tokenEntitlement: string | undefined
        if (entitlementDetails?.users.length > 0) {
            // add roleId to user entitlement address for channel
            userEntitlement = entitlementShims?.userEntitlement?.address
            encodedCallData.push(
                space.interface.encodeFunctionData('addRoleToChannel', [
                    channelNetworkId,
                    userEntitlement as string,
                    BigNumber.from(roleId),
                ]),
            )
        }
        if (entitlementDetails?.tokens.length > 0) {
            // add roleId to token entitlement address for channel
            tokenEntitlement = entitlementShims?.tokenEntitlement?.address
            encodedCallData.push(
                space.interface.encodeFunctionData('addRoleToChannel', [
                    channelNetworkId,
                    tokenEntitlement as string,
                    roleId,
                ]),
            )
        }
        return space.write.multicall(encodedCallData, { gasLimit: 100000 })
    }

    public async getRole(spaceId: string, roleId: number): Promise<RoleDetails> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        const entitlementShims = await this.createEntitlementShims(space)
        const [role, permissions, entitlementDetails, channels] = await Promise.all([
            space.read.getRoleById(roleId),
            space.getPermissionsByRoleId(roleId),
            this.getEntitlementDetails(space, entitlementShims, roleId),
            this.getChannelsWithRole(space, entitlementShims, roleId),
        ])
        // found the role. return the details
        const roleName: string | undefined = role?.name
        return {
            id: roleId,
            name: roleName,
            permissions: permissions,
            tokens: entitlementDetails.tokens,
            users: entitlementDetails.users,
            channels,
        }
    }

    public async getRoles(spaceId: string): Promise<SpaceDataTypes.RoleStructOutput[]> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.read.getRoles()
    }

    public async getRolesByChannel(
        spaceId: string,
        channelNetworkId: string,
    ): Promise<SpaceDataTypes.RoleStructOutput[]> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        const channelHash = keccak256(toUtf8Bytes(channelNetworkId))
        const channelAddress = await space.read?.getChannelByHash(channelHash)
        if (!channelAddress) {
            throw new Error(`Channel with networkId "${channelNetworkId}" is not found.`)
        }
        return this.getUniqueRolesByChannel(space, channelNetworkId)
    }

    public async getPermissionsByRoleId(spaceId: string, roleId: number): Promise<Permission[]> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.getPermissionsByRoleId(roleId)
    }

    public getSpaceFactoryEventsContractInfo(): EventsContractInfo {
        return {
            abi: this.spaceFactory.eventsAbi,
            address: this.spaceFactory.address,
        }
    }

    public async getSpaceEventsContractInfo(spaceId: string): Promise<EventsContractInfo> {
        const space = await this.getSpace(spaceId)
        if (!space?.eventsAbi) {
            throw new Error(`events abi for space "${spaceId}" is not found.`)
        }
        return {
            abi: space.eventsAbi,
            address: space.address,
        }
    }

    public async getSpaceInfo(
        spaceId: string,
        requireSigner = true,
    ): Promise<SpaceInfo | undefined> {
        const space = await this.getSpace(spaceId, requireSigner)
        if (space?.read) {
            const [name, owner, disabled] = await Promise.all([
                space.read.name(),
                space.read.owner(),
                space.read.disabled(),
            ])
            return {
                address: space.address,
                networkId: spaceId,
                name,
                owner,
                disabled,
            }
        }
        // space not found.
        return undefined
    }

    public async isEntitledToSpace(
        spaceId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            return false
        }
        return space.read.isEntitledToSpace(user, permission)
    }

    public async isEntitledToChannel(
        spaceId: string,
        channelId: string,
        user: string,
        permission: Permission,
    ): Promise<boolean> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            return false
        }
        return space.read.isEntitledToChannel(channelId, user, permission)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public parseSpaceFactoryError(error: any): Error {
        if (!this.spaceFactory.write) {
            throw new Error('SpaceFactory write contract is not deployed properly.')
        }
        return this.spaceFactory.parseError(error)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async parseSpaceError(spaceId: string, error: any): Promise<Error> {
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.parseError(error)
    }

    public async setSpaceAccess(spaceId: string, disabled: boolean): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not deployed properly.`)
        }
        return space.write.setSpaceAccess(disabled)
    }

    public async setChannelAccess(
        spaceId: string,
        channelId: string,
        disabled: boolean,
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not deployed properly.`)
        }
        return space.write.setChannelAccess(channelId, disabled)
    }

    public async deleteRole(spaceId: string, roleId: number): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Cannot find Space with networkId "${spaceId}"`)
        }
        const encodedCallData: BytesLike[] = []
        const [modules, roleDetails] = await Promise.all([
            space.getEntitlementModules(),
            this.getRole(spaceId, roleId),
        ])
        if (!roleDetails) {
            throw new Error(
                `Role with spaceNetworkId "${spaceId}", roleId: "${roleId}" is not found.`,
            )
        }
        // delete role from the channels
        const encodedDeleteRoleFromChannels = await this.encodeDeleteRoleFromChannels(
            space,
            modules,
            roleDetails,
        )
        for (const c of encodedDeleteRoleFromChannels) {
            encodedCallData.push(c)
        }
        // delete role from the entitlements
        const encodedDeleteRoleFromEntitlements = await this.encodeDeleteRoleFromEntitlements(
            space,
            modules,
            roleDetails.id,
        )
        for (const e of encodedDeleteRoleFromEntitlements) {
            encodedCallData.push(e)
        }
        // finally, delete the role
        encodedCallData.push(this.encodeRoleDelete(space, roleId))
        // invoke the multicall transaction
        return space.write.multicall(encodedCallData)
    }

    public async updateChannel(params: UpdateChannelParams): Promise<ContractTransaction> {
        const space = await this.getSpace(params.spaceNetworkId)
        if (!space?.write) {
            throw new Error(
                `Space with networkId "${params.spaceNetworkId}" is not deployed properly.`,
            )
        }
        // update any channel name changes
        return space.write.updateChannel(params.channelNetworkId, params.channelName)
    }

    public async updateRole(params: UpdateRoleParams): Promise<ContractTransaction> {
        const space = await this.getSpace(params.spaceNetworkId)
        if (!space?.write) {
            throw new Error(
                `Space with networkId "${params.spaceNetworkId}" is not deployed properly.`,
            )
        }
        // update any role name changes
        const roleDetails = await this.getRole(params.spaceNetworkId, params.roleId)
        if (!roleDetails) {
            throw new Error(
                `Role with spaceNetworkId "${params.spaceNetworkId}", roleId: "${params.roleId}" is not found.`,
            )
        }
        const encodedCallData: BytesLike[] = []
        if (roleDetails.name !== params.roleName) {
            encodedCallData.push(this.encodeRoleNameUpdate(space, params))
        }
        // update any permission changes
        const encodePermissionChanges = this.encodePermissionUpdate(space, roleDetails, params)
        for (const p of encodePermissionChanges) {
            encodedCallData.push(p)
        }
        // update any entitlement changes
        const encodeEntitlementChanges = await this.encodeEntitlementsUpdate(space, params)
        for (const entitlement of encodeEntitlementChanges) {
            encodedCallData.push(entitlement)
        }
        // invoke the multicall transaction
        return space.write.multicall(encodedCallData)
    }

    private async encodeDeleteRoleFromChannels(
        space: SpaceShim,
        modules: EntitlementModule[],
        roleDetails: RoleDetails,
    ): Promise<BytesLike[]> {
        const encodedCallData: BytesLike[] = []
        const channels = await space.getChannels()
        // get the module addresses because we need to call the removeRoleIdFromChannel
        let tokenModuleAddress: string | undefined
        let userModuleAddress: string | undefined
        for (const m of modules) {
            switch (m.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    tokenModuleAddress = m.address
                    break
                case EntitlementModuleType.UserEntitlement:
                    userModuleAddress = m.address
                    break
                default:
                    throw new Error(`Unsupported module type: ${m.moduleType as string}`)
            }
        }
        for (const c of channels) {
            if (roleDetails.tokens.length > 0 && tokenModuleAddress) {
                encodedCallData.push(
                    space.interface.encodeFunctionData('removeRoleFromChannel', [
                        c.channelNetworkId,
                        tokenModuleAddress,
                        roleDetails.id,
                    ]),
                )
            } else if (roleDetails.users.length > 0 && userModuleAddress) {
                encodedCallData.push(
                    space.interface.encodeFunctionData('removeRoleFromChannel', [
                        c.channelNetworkId,
                        userModuleAddress,
                        roleDetails.id,
                    ]),
                )
            }
        }
        // return all the encoded function calls to remove the role from the channels
        return encodedCallData
    }

    private async encodeDeleteRoleFromEntitlements(
        space: SpaceShim,
        modules: EntitlementModule[],
        roleId: number,
    ): Promise<BytesLike[]> {
        const encodedCallData: BytesLike[] = []
        // get current entitlements for the role
        const entitlementShims = await this.createEntitlementShims(space)
        const entitlementsDetails = await this.getEntitlementDetails(
            space,
            entitlementShims,
            roleId,
        )
        // remove current entitlements
        const encodeRemoveRoleFromEntitlement = this.encodeRemoveRoleFromEntitlement(
            space,
            roleId,
            modules,
            entitlementsDetails,
        )
        for (const e of encodeRemoveRoleFromEntitlement) {
            encodedCallData.push(e)
        }
        return encodedCallData
    }

    private encodeRoleDelete(space: SpaceShim, roleId: number): string {
        return space.interface.encodeFunctionData('removeRole', [BigNumber.from(roleId)])
    }

    private encodeRoleNameUpdate(space: SpaceShim, params: UpdateRoleParams): string {
        return space.interface.encodeFunctionData('updateRole', [
            BigNumber.from(params.roleId),
            params.roleName,
        ])
    }

    private encodePermissionUpdate(
        space: SpaceShim,
        roleDetails: RoleDetails,
        params: UpdateRoleParams,
    ): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        // remove current permissions
        const encodedRemovedPermissionChanges = space.encodeRemovePermissionsFromRole(
            params.roleId,
            roleDetails.permissions,
        )
        for (const p of encodedRemovedPermissionChanges) {
            encodedCallData.push(p)
        }
        // replace with new permissions
        const encodedAddPermissionChanges = space.encodeAddPermissionsToRole(
            params.roleId,
            params.permissions,
        )
        for (const p of encodedAddPermissionChanges) {
            encodedCallData.push(p)
        }
        // return all the encoded function calls to update the permissions
        return encodedCallData
    }

    private async encodeEntitlementsUpdate(
        space: SpaceShim,
        params: UpdateRoleParams,
    ): Promise<BytesLike[]> {
        const encodedCallData: BytesLike[] = []
        // get current entitlements for the role
        const entitlementShims = await this.createEntitlementShims(space)
        const [modules, currentEntitlements] = await Promise.all([
            space.getEntitlementModules(),
            this.getEntitlementDetails(space, entitlementShims, params.roleId),
        ])
        // remove current entitlements
        const encodeRemoveRoleFromEntitlement = this.encodeRemoveRoleFromEntitlement(
            space,
            params.roleId,
            modules,
            currentEntitlements,
        )
        for (const e of encodeRemoveRoleFromEntitlement) {
            encodedCallData.push(e)
        }
        // replace with new entitlements
        const encodeAddRoleToEntitlement = this.encodeAddRoleToEntitlement(
            space,
            params.roleId,
            modules,
            {
                tokens: params.tokens,
                users: params.users,
            },
        )
        for (const e of encodeAddRoleToEntitlement) {
            encodedCallData.push(e)
        }
        // return all the encoded function calls to update the entitlements
        return encodedCallData
    }

    private encodeAddRoleToEntitlement(
        space: SpaceShim,
        roleId: number,
        modules: EntitlementModule[],
        entitlements: EntitlementData,
    ): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const m of modules) {
            switch (m.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    {
                        // contract execution will revert if the tokens array is empty
                        if (entitlements.tokens.length) {
                            const entitlement = createTokenEntitlementStruct(
                                m.address,
                                entitlements.tokens,
                            )
                            const addRole = space.interface.encodeFunctionData(
                                'addRoleToEntitlement',
                                [roleId, entitlement],
                            )
                            encodedCallData.push(addRole)
                        }
                    }
                    break
                case EntitlementModuleType.UserEntitlement:
                    {
                        // contract execution will revert if the users array is empty
                        if (entitlements.users.length) {
                            const entitlement = createUserEntitlementStruct(
                                m.address,
                                entitlements.users,
                            )
                            const removeRole = space.interface.encodeFunctionData(
                                'addRoleToEntitlement',
                                [roleId, entitlement],
                            )
                            encodedCallData.push(removeRole)
                        }
                    }
                    break
                default:
                    throw new Error(
                        `Unsupported entitlement module type: ${m.moduleType as string}`,
                    )
            }
        }
        // return all the encoded function calls to add the role to the entitlements
        return encodedCallData
    }

    private encodeRemoveRoleFromEntitlement(
        space: SpaceShim,
        roleId: number,
        modules: EntitlementModule[],
        entitlements: EntitlementData,
    ): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const m of modules) {
            switch (m.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    {
                        // contract execution will revert if the tokens array is empty
                        if (entitlements.tokens.length) {
                            const entitlement = createTokenEntitlementStruct(
                                m.address,
                                entitlements.tokens,
                            )
                            const removeRole = space.interface.encodeFunctionData(
                                'removeRoleFromEntitlement',
                                [roleId, entitlement],
                            )
                            encodedCallData.push(removeRole)
                        }
                    }
                    break
                case EntitlementModuleType.UserEntitlement:
                    {
                        // contract execution will revert if the users array is empty
                        if (entitlements.users.length) {
                            const entitlement = createUserEntitlementStruct(
                                m.address,
                                entitlements.users,
                            )
                            const removeRole = space.interface.encodeFunctionData(
                                'removeRoleFromEntitlement',
                                [roleId, entitlement],
                            )
                            encodedCallData.push(removeRole)
                        }
                    }
                    break
                default:
                    throw new Error(
                        `Unsupported entitlement module type: ${m.moduleType as string}`,
                    )
            }
        }
        // return all the encoded function calls to remove the role from the entitlements
        return encodedCallData
    }

    private async getEntitlementDetails(
        space: SpaceShim,
        entitlementShims: EntitlementShims,
        roleId: number,
    ): Promise<EntitlementData> {
        let rawTokenDetails: TokenDataTypes.ExternalTokenStruct[][] = []
        let rawUserDetails: string[][] = []
        // Get entitlement details.
        if (entitlementShims.tokenEntitlement && entitlementShims.userEntitlement) {
            // Case 1: both token and user entitlements are defined.
            ;[rawTokenDetails, rawUserDetails] = await Promise.all([
                this.getTokenEntitlementDetails(roleId, entitlementShims.tokenEntitlement),
                this.getUserEntitlementDetails(roleId, entitlementShims.userEntitlement),
            ])
        } else if (entitlementShims.tokenEntitlement) {
            // Case 2: only token entitlement is defined.
            rawTokenDetails = await this.getTokenEntitlementDetails(
                roleId,
                entitlementShims.tokenEntitlement,
            )
        } else if (entitlementShims.userEntitlement) {
            // Case 3: only user entitlement is defined.
            rawUserDetails = await this.getUserEntitlementDetails(
                roleId,
                entitlementShims.userEntitlement,
            )
        }
        // Verify that we have only one token and one user entitlement.
        // The app only requires one at the moment.
        // In the future we might want to support more.
        if (rawTokenDetails.length > 1) {
            throw new Error('More than one token entitlement not supported at the moment.')
        }
        if (rawUserDetails.length > 1) {
            throw new Error('More than one user entitlement not supported at the moment.')
        }
        // Return the entitlement details.
        const tokens: TokenDataTypes.ExternalTokenStruct[] = rawTokenDetails.length
            ? rawTokenDetails[0]
            : []
        const users: string[] = rawUserDetails.length ? rawUserDetails[0] : []
        return {
            tokens,
            users,
        }
    }

    private async createEntitlementShims(space: SpaceShim): Promise<EntitlementShims> {
        const modules = await space.getEntitlementModules()
        let tokenEntitlement: TokenEntitlementShim | undefined = undefined
        let userEntitlement: UserEntitlementShim | undefined = undefined
        for (const m of modules) {
            switch (m.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    tokenEntitlement = ShimFactory.createTokenEntitlement(
                        m.address,
                        space.chainId,
                        space.provider,
                        space.signer,
                    )
                    break
                case EntitlementModuleType.UserEntitlement:
                    userEntitlement = ShimFactory.createUserEntitlement(
                        m.address,
                        space.chainId,
                        space.provider,
                        space.signer,
                    )
                    break
                default:
                    throw new Error(
                        `Unsupported entitlement module type: ${m.moduleType as string}`,
                    )
            }
        }

        return {
            tokenEntitlement,
            userEntitlement,
        }
    }

    private async getTokenEntitlementDetails(
        roleId: number,
        tokenEntitlement: TokenEntitlementShim,
    ): Promise<TokenDataTypes.ExternalTokenStruct[][]> {
        // a token-gated entitlement can have multiple tokens OR together, or AND together.
        // the first dimensions are the ORs; the second dimensions are the ANDs.
        const details: TokenDataTypes.ExternalTokenStruct[][] = []
        const encodedTokens = await tokenEntitlement.read.getEntitlementDataByRoleId(roleId)
        for (const t of encodedTokens) {
            const tokens = decodeExternalTokens(t)
            details.push(tokens)
        }
        return details
    }

    private async getUserEntitlementDetails(
        roleId: number,
        userEntitlement: UserEntitlementShim,
    ): Promise<string[][]> {
        // a user-gated entitlement has multiple user arrays OR together or AND together.
        // the first dimensions are the ORs; the second dimensions are the ANDs.
        const details: string[][] = []
        const encodedUsers = await userEntitlement.read.getEntitlementDataByRoleId(roleId)
        for (const u of encodedUsers) {
            const users = decodeUsers(u)
            details.push(users)
        }
        return details
    }

    private async getChannelsWithRole(
        space: SpaceShim,
        entitlementShims: EntitlementShims,
        roleId: number,
    ): Promise<Channel[]> {
        const uniqueChannelIds = new Set<string>()
        // get all the channels from the space
        const allChannels = await space.getChannels()
        // for each channel, check with each entitlement if the role is in the channel
        const tokenEntitlement = entitlementShims.tokenEntitlement
        const userEntitlement = entitlementShims.userEntitlement
        for (const c of allChannels) {
            // check if the role is in the token entitlement for that channel
            let roleIds = await tokenEntitlement?.getRoleIdsByChannelId(c.channelNetworkId)
            if (roleIds) {
                if (this.isRoleIdInArray(roleIds, roleId)) {
                    uniqueChannelIds.add(c.channelNetworkId)
                    continue
                }
            }
            // check if the role is in the user entitlement for that channel
            roleIds = await userEntitlement?.getRoleIdsByChannelId(c.channelNetworkId)
            if (roleIds) {
                if (this.isRoleIdInArray(roleIds, roleId)) {
                    uniqueChannelIds.add(c.channelNetworkId)
                    continue
                }
            }
        }
        // get details for each channel
        const channelPromises: Promise<Channel | undefined>[] = []
        for (const c of uniqueChannelIds.values()) {
            channelPromises.push(this.getChannelDetails(space, c))
        }
        const channelDetails = await Promise.all(channelPromises)
        // return only channels with details
        return channelDetails.filter((c) => c !== undefined) as Channel[]
    }

    private isRoleIdInArray(roleIds: BigNumber[], roleId: number): boolean {
        for (const r of roleIds) {
            if (r.eq(roleId)) {
                return true
            }
        }
        return false
    }

    private async getChannelDetails(
        space: SpaceShim,
        channelNetworkId: string,
    ): Promise<Channel | undefined> {
        const channelHash = keccak256(toUtf8Bytes(channelNetworkId))
        const channel = await space.read?.channelsByHash(channelHash)
        if (channel) {
            return {
                channelNetworkId,
                name: channel.name,
                disabled: channel.disabled,
            }
        }
        return undefined
    }

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    private async getUniqueRolesByChannel(
        space: SpaceShim,
        channelNetworkId: string,
    ): Promise<SpaceDataTypes.RoleStructOutput[]> {
        const roleIds: number[] = []
        // get entitlement contracts for the space
        const entitlementShim = await this.createEntitlementShims(space)
        let tokenEntitlements: any
        let userEntitlements: any
        if (entitlementShim.tokenEntitlement && entitlementShim.userEntitlement) {
            tokenEntitlements = entitlementShim.tokenEntitlement
            userEntitlements = entitlementShim.userEntitlement
        } else if (entitlementShim.tokenEntitlement) {
            tokenEntitlements = entitlementShim.tokenEntitlement
        } else if (entitlementShim.userEntitlement) {
            userEntitlements = entitlementShim.userEntitlement
        }
        // get the role ids for the channel
        const roles: SpaceDataTypes.RoleStructOutput[] = []

        let channelRoleIds: BigNumber[] = await tokenEntitlements?.read?.getRoleIdsByChannelId(
            channelNetworkId,
        )
        roleIds.push(
            ...channelRoleIds.map((id) => {
                return id.toNumber()
            }),
        )

        channelRoleIds = await userEntitlements?.read?.getRoleIdsByChannelId(channelNetworkId)
        roleIds.push(
            ...channelRoleIds.map((id) => {
                return id.toNumber()
            }),
        )
        const uniqueRoleIds = [...new Set(roleIds)]
        for (const roleId of uniqueRoleIds) {
            const role = await space.read?.getRoleById(roleId)
            if (role) {
                roles.push(role)
            }
        }
        return roles
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
}
