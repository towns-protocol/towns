import { BigNumber, ContractTransaction, ethers } from 'ethers'
import { BytesLike, keccak256 } from 'ethers/lib/utils'
import {
    ChannelDetails,
    ChannelMetadata,
    EntitlementModuleType,
    Permission,
    RoleDetails,
    RoleEntitlements,
} from './ContractTypes'
import { CreateSpaceParams, ISpaceDapp, UpdateChannelParams, UpdateRoleParams } from './ISpaceDapp'
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

    constructor(chainId: number, provider: ethers.providers.Provider | undefined) {
        this.chainId = chainId
        this.provider = provider
        this.contractsInfo = getContractsInfo(chainId)
        this.spaceFactory = new SpaceFactoryShim(
            this.contractsInfo.spaceFactory.address,
            this.contractsInfo.spaceFactory.abi,
            chainId,
            provider,
        )
    }

    public createSpace(
        params: CreateSpaceParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        if (!this.spaceFactory.write) {
            throw new Error('SpaceFactory write contract is not deployed properly.')
        }
        const createSpaceData = {
            spaceId: params.spaceId,
            spaceName: params.spaceName,
            spaceMetadata: params.spaceMetadata,
            channelId: params.channelId,
            channelName: params.channelName,
        }
        return this.spaceFactory
            .write(signer)
            .createSpace(createSpaceData, params.everyonePermissions, params.memberEntitlements)
    }

    public async createChannel(
        spaceId: string,
        channelName: string,
        channelNetworkId: string,
        roleIds: number[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.write(signer).createChannel(channelName, channelNetworkId, roleIds)
    }

    public async createRole(
        spaceId: string,
        roleName: string,
        permissions: Permission[],
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
        users: string[],
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.read || !space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }

        // figure out the addresses for each entitlement module
        const entitlementModules = await space.read.getEntitlementModules()
        let tokenModuleAddress = ''
        let userModuleAddress = ''
        for (const module of entitlementModules) {
            switch (module.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    tokenModuleAddress = module.moduleAddress
                    break
                case EntitlementModuleType.UserEntitlement:
                    userModuleAddress = module.moduleAddress
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
        return space.write(signer).createRole(roleName, permissions, entitlements)
    }

    public async getSpace(spaceId: string): Promise<SpaceShim | undefined> {
        if (!this.provider) {
            throw new Error('Provider or signer is not set.')
        }
        if (!this.spaces[spaceId]) {
            const hash = keccak256(toUtf8Bytes(spaceId))
            const spaceAddress = await this.spaceFactory.read?.spaceByHash(hash)
            if (!spaceAddress || spaceAddress === ethers.constants.AddressZero) {
                return undefined // space is not found
            }
            const abi = ShimFactory.getSpaceAbi(this.chainId, spaceId)
            this.spaces[spaceId] = new SpaceShim(spaceAddress, abi, this.chainId, this.provider)
        }
        return this.spaces[spaceId]
    }

    public async addRoleToChannel(
        spaceId: string,
        channelNetworkId: string,
        roleId: number,
        signer: ethers.Signer,
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
        return space.write(signer).multicall(encodedCallData, { gasLimit: 100000 })
    }

    public async getChannelDetails(
        spaceId: string,
        channelNetworkId: string,
    ): Promise<ChannelDetails | null> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        // get most of the channel details except the roles which
        // require a separate call to get each role's details
        const [entitlementShims, metadata, channelRoles] = await Promise.all([
            this.createEntitlementShims(space),
            this.getChannelMetadata(space, channelNetworkId),
            this.getRolesByChannel(spaceId, channelNetworkId),
        ])
        // found the channel's metadata. now get the rest of the details
        if (metadata) {
            // get details for each role
            const getRoleEntitlementsAsync: Promise<RoleEntitlements>[] = []
            for (const role of channelRoles) {
                getRoleEntitlementsAsync.push(
                    this.getRoleEntitlements(space, entitlementShims, role.roleId.toNumber()),
                )
            }
            const roles = await Promise.all(getRoleEntitlementsAsync)
            return {
                spaceNetworkId: spaceId,
                channelNetworkId: metadata.channelNetworkId,
                name: metadata.name,
                disabled: metadata.disabled,
                roles,
            }
        }
        // did not find the channel
        return null
    }

    public async getRole(spaceId: string, roleId: number): Promise<RoleDetails | null> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        const entitlementShims = await this.createEntitlementShims(space)
        const [roleEntitlements, channels] = await Promise.all([
            this.getRoleEntitlements(space, entitlementShims, roleId),
            this.getChannelsWithRole(space, spaceId, entitlementShims, roleId),
        ])
        if (roleEntitlements && roleEntitlements.roleId !== 0) {
            // found the role. return the details
            return {
                id: roleId,
                name: roleEntitlements.name,
                permissions: roleEntitlements.permissions,
                tokens: roleEntitlements.tokens,
                users: roleEntitlements.users,
                channels,
            }
        }
        // did not find the role
        return null
    }

    public async getRoles(spaceId: string): Promise<SpaceDataTypes.RoleStructOutput[]> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        const roles = await space.read.getRoles()
        return roles.filter((role) => role.roleId.toNumber() !== 0)
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

    public async getSpaceInfo(spaceId: string): Promise<SpaceInfo | undefined> {
        const space = await this.getSpace(spaceId)
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

    public async setSpaceAccess(
        spaceId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not deployed properly.`)
        }
        return space.write(signer).setSpaceAccess(disabled)
    }

    public async setChannelAccess(
        spaceId: string,
        channelId: string,
        disabled: boolean,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Space with networkId "${spaceId}" is not deployed properly.`)
        }
        return space.write(signer).setChannelAccess(channelId, disabled)
    }

    public async deleteRole(
        spaceId: string,
        roleId: number,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(spaceId)
        if (!space?.write) {
            throw new Error(`Cannot find Space with networkId "${spaceId}"`)
        }
        const encodedCallData: BytesLike[] = []
        const [modules, roleDetails] = await Promise.all([
            space.read.getEntitlementModules(),
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
        return space.write(signer).multicall(encodedCallData)
    }

    public async updateChannel(
        params: UpdateChannelParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
        const space = await this.getSpace(params.spaceId)
        if (!space?.write) {
            throw new Error(`Space with networkId "${params.spaceId}" is not deployed properly.`)
        }
        const encodedCallData: BytesLike[] = []
        // update any channel name changes
        const channelDetails = await this.getChannelDetails(params.spaceId, params.channelId)
        if (!channelDetails) {
            // cannot find this channel
            throw new Error(
                `Channel with spaceNetworkId "${params.spaceId}", channelId: "${params.channelId}" is not found.`,
            )
        }
        if (channelDetails.name !== params.channelName) {
            encodedCallData.push(
                space.interface.encodeFunctionData('updateChannel', [
                    params.channelId,
                    params.channelName,
                ]),
            )
        }
        // update any channel role changes
        const encodedUpdateChannelRoles = await this.encodeUpdateChannelRoles(
            space,
            params.spaceId,
            params.channelId,
            params.roleIds,
        )
        for (const callData of encodedUpdateChannelRoles) {
            encodedCallData.push(callData)
        }
        return space.write(signer).multicall(encodedCallData)
    }

    public async updateRole(
        params: UpdateRoleParams,
        signer: ethers.Signer,
    ): Promise<ContractTransaction> {
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
        return space.write(signer).multicall(encodedCallData)
    }

    public async getChannels(spaceId: string) {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.getChannels()
    }

    private async encodeDeleteRoleFromChannels(
        space: SpaceShim,
        modules: SpaceDataTypes.EntitlementModuleStructOutput[],
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
                    tokenModuleAddress = m.moduleAddress
                    break
                case EntitlementModuleType.UserEntitlement:
                    userModuleAddress = m.moduleAddress
                    break
                default:
                    throw new Error(`Unsupported module type: ${m.moduleType}`)
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
        modules: SpaceDataTypes.EntitlementModuleStructOutput[],
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
        // get all the permissions in the role to figure out which ones to add and which to remove
        const currentPermissions = new Set<Permission>(roleDetails.permissions)
        const updatedPermissions = new Set<Permission>(params.permissions)
        const permissionsToRemove: Permission[] = []
        const permissionsToAdd: Permission[] = []
        for (const r of updatedPermissions) {
            // if the current permissions does not include the updated permission, then that permission should be added.
            if (!currentPermissions.has(r)) {
                permissionsToAdd.push(r)
            }
        }
        for (const r of currentPermissions) {
            // if the updated permissions no longer have the current permission, then that permissions should be removed.
            if (!updatedPermissions.has(r)) {
                permissionsToRemove.push(r)
            }
        }
        // add any new permissions
        if (permissionsToAdd.length > 0) {
            encodedCallData.push(
                space.interface.encodeFunctionData('addPermissionsToRole', [
                    params.roleId,
                    permissionsToAdd,
                ]),
            )
        }
        // remove any old permissions
        if (permissionsToRemove.length > 0) {
            encodedCallData.push(
                space.interface.encodeFunctionData('removePermissionsFromRole', [
                    params.roleId,
                    permissionsToRemove,
                ]),
            )
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
            space.read.getEntitlementModules(),
            this.getEntitlementDetails(space, entitlementShims, params.roleId),
        ])
        // compare the current entitlements with the updated entitlements to
        // figure out which ones to add and which to remove
        const entitlementsToRemove: EntitlementData = {
            tokens: [],
            users: [],
        }
        const entitlementsToAdd: EntitlementData = {
            tokens: [],
            users: [],
        }
        if (!this.areTokenEntitlementsEqual(currentEntitlements.tokens, params.tokens)) {
            entitlementsToRemove.tokens = currentEntitlements.tokens
            entitlementsToAdd.tokens = params.tokens
        }
        if (!this.areUserEntitlementsEqual(currentEntitlements.users, params.users)) {
            entitlementsToRemove.users = currentEntitlements.users
            entitlementsToAdd.users = params.users
        }
        // add entitlements if any
        // note: Add must preceed Remove. Otherwise, the smart contract's internal logic may revert.
        // e.g. in order to add a new moderator, the user must first be added to the user's entitlementData.
        // then, the old user entitlementData must be removed from the role. If the reverse happens, the smart contract
        // may revert because the user who is making this change would have been removed first.
        if (entitlementsToAdd.tokens.length > 0 || entitlementsToAdd.users.length > 0) {
            const encodeAddRoleToEntitlement = this.encodeAddRoleToEntitlement(
                space,
                params.roleId,
                modules,
                entitlementsToAdd,
            )
            for (const e of encodeAddRoleToEntitlement) {
                encodedCallData.push(e)
            }
        }
        // remove outdated entitlements from current
        if (entitlementsToRemove.tokens.length > 0 || entitlementsToRemove.users.length > 0) {
            const encodeRemoveRoleFromEntitlement = this.encodeRemoveRoleFromEntitlement(
                space,
                params.roleId,
                modules,
                entitlementsToRemove,
            )
            for (const e of encodeRemoveRoleFromEntitlement) {
                encodedCallData.push(e)
            }
        }
        // return all the encoded function calls to update the entitlements
        return encodedCallData
    }

    private encodeAddRoleToEntitlement(
        space: SpaceShim,
        roleId: number,
        modules: SpaceDataTypes.EntitlementModuleStructOutput[],
        entitlementsToAdd: EntitlementData,
    ): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const m of modules) {
            switch (m.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    {
                        // contract execution will revert if the tokens array is empty
                        if (entitlementsToAdd.tokens.length) {
                            const entitlement = createTokenEntitlementStruct(
                                m.moduleAddress,
                                entitlementsToAdd.tokens,
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
                        if (entitlementsToAdd.users.length) {
                            const entitlement = createUserEntitlementStruct(
                                m.moduleAddress,
                                entitlementsToAdd.users,
                            )
                            const addRole = space.interface.encodeFunctionData(
                                'addRoleToEntitlement',
                                [roleId, entitlement],
                            )
                            encodedCallData.push(addRole)
                        }
                    }
                    break
                default:
                    throw new Error(`Unsupported entitlement module type: ${m.moduleType}`)
            }
        }
        // return all the encoded function calls to add the role to the entitlements
        return encodedCallData
    }

    private encodeRemoveRoleFromEntitlement(
        space: SpaceShim,
        roleId: number,
        modules: SpaceDataTypes.EntitlementModuleStructOutput[],
        entitlementsToRemove: EntitlementData,
    ): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const m of modules) {
            switch (m.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    {
                        // contract execution will revert if the tokens array is empty
                        if (entitlementsToRemove.tokens.length) {
                            const entitlement = createTokenEntitlementStruct(
                                m.moduleAddress,
                                entitlementsToRemove.tokens,
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
                        if (entitlementsToRemove.users.length) {
                            const entitlement = createUserEntitlementStruct(
                                m.moduleAddress,
                                entitlementsToRemove.users,
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
                    throw new Error(`Unsupported entitlement module type: ${m.moduleType}`)
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
            console.error(
                'More than one token entitlement not supported at the moment.',
                rawTokenDetails,
            )
            throw new Error('More than one token entitlement not supported at the moment.')
        }
        if (rawUserDetails.length > 1) {
            console.error(
                'More than one user entitlement not supported at the moment.',
                rawUserDetails,
            )
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

    private areTokenEntitlementsEqual(
        a: TokenDataTypes.ExternalTokenStruct[],
        b: TokenDataTypes.ExternalTokenStruct[],
    ): boolean {
        if (a.length !== b.length) {
            return false
        }
        for (const aToken of a) {
            if (!b.some((bToken) => this.isEqualToken(aToken, bToken))) {
                return false
            }
        }
        return true
    }

    private areUserEntitlementsEqual(a: string[], b: string[]): boolean {
        if (a.length !== b.length) {
            return false
        }
        for (const aUser of a) {
            if (!b.some((bUser) => aUser === bUser)) {
                return false
            }
        }
        return true
    }

    private isEqualToken(
        a: TokenDataTypes.ExternalTokenStruct,
        b: TokenDataTypes.ExternalTokenStruct,
    ): boolean {
        const aTokenAddress = (a.contractAddress as string).toLowerCase()
        const bTokenAddress = (b.contractAddress as string).toLowerCase()
        const aQuantity = ethers.BigNumber.from(a.quantity)
        const bQuantity = ethers.BigNumber.from(b.quantity)
        return (
            aTokenAddress === bTokenAddress &&
            aQuantity.eq(bQuantity) &&
            a.isSingleToken === b.isSingleToken &&
            this.isEqualTokenIds(a.tokenIds as BigNumber[], b.tokenIds as BigNumber[])
        )
    }

    private isEqualTokenIds(a: BigNumber[], b: BigNumber[]): boolean {
        if (a.length !== b.length) {
            return false
        }
        for (let i = 0; i < a.length; i++) {
            if (!a[i].eq(b[i])) {
                return false
            }
        }
        return true
    }

    private async createEntitlementShims(space: SpaceShim): Promise<EntitlementShims> {
        const modules = await space.read.getEntitlementModules()
        let tokenEntitlement: TokenEntitlementShim | undefined = undefined
        let userEntitlement: UserEntitlementShim | undefined = undefined
        for (const m of modules) {
            switch (m.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    tokenEntitlement = ShimFactory.createTokenEntitlement(
                        m.moduleAddress,
                        space.chainId,
                        space.provider,
                    )
                    break
                case EntitlementModuleType.UserEntitlement:
                    userEntitlement = ShimFactory.createUserEntitlement(
                        m.moduleAddress,
                        space.chainId,
                        space.provider,
                    )
                    break
                default:
                    throw new Error(`Unsupported entitlement module type: ${m.moduleType}`)
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
        spaceNetworkId: string,
        entitlementShims: EntitlementShims,
        roleId: number,
    ): Promise<ChannelMetadata[]> {
        const uniqueChannelIds = new Set<string>()
        // get all the channels from the space
        const allChannels = await space.getChannels()
        // for each channel, check with each entitlement if the role is in the channel
        const tokenEntitlement = entitlementShims.tokenEntitlement
        const userEntitlement = entitlementShims.userEntitlement
        for (const c of allChannels) {
            // check if the role is in the token entitlement for that channel
            let roleIds = await tokenEntitlement?.read.getRoleIdsByChannelId(c.channelNetworkId)
            if (roleIds) {
                if (this.isRoleIdInArray(roleIds, roleId)) {
                    uniqueChannelIds.add(c.channelNetworkId)
                    continue
                }
            }
            // check if the role is in the user entitlement for that channel
            roleIds = await userEntitlement?.read.getRoleIdsByChannelId(c.channelNetworkId)
            if (roleIds) {
                if (this.isRoleIdInArray(roleIds, roleId)) {
                    uniqueChannelIds.add(c.channelNetworkId)
                    continue
                }
            }
        }
        // get details for each channel
        const channelPromises: Promise<ChannelMetadata | null>[] = []
        for (const c of uniqueChannelIds.values()) {
            channelPromises.push(this.getChannelMetadata(space, c))
        }
        const channelDetails = await Promise.all(channelPromises)
        // return only channels with details
        return channelDetails.filter((c) => c !== undefined) as ChannelMetadata[]
    }

    private isRoleIdInArray(roleIds: BigNumber[], roleId: number): boolean {
        for (const r of roleIds) {
            if (r.eq(roleId)) {
                return true
            }
        }
        return false
    }

    private async getChannelMetadata(
        space: SpaceShim,
        channelNetworkId: string,
    ): Promise<ChannelMetadata | null> {
        const channelHash = keccak256(toUtf8Bytes(channelNetworkId))
        const channel = await space.read?.channelsByHash(channelHash)
        if (channel) {
            return {
                channelNetworkId,
                name: channel.name,
                disabled: channel.disabled,
            }
        }
        return null
    }

    private async getUniqueRolesByChannel(
        space: SpaceShim,
        channelNetworkId: string,
    ): Promise<SpaceDataTypes.RoleStructOutput[]> {
        const roleIds: number[] = []
        // get entitlement contracts for the space
        const entitlementShim = await this.createEntitlementShims(space)
        let tokenEntitlements: TokenEntitlementShim | undefined
        let userEntitlements: UserEntitlementShim | undefined
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
        const [tokenRoleIds, userRoleIds] = await Promise.all([
            tokenEntitlements?.read?.getRoleIdsByChannelId(channelNetworkId),
            userEntitlements?.read?.getRoleIdsByChannelId(channelNetworkId),
        ])
        if (tokenRoleIds) {
            for (const r of tokenRoleIds) {
                roleIds.push(r.toNumber())
            }
        }
        if (userRoleIds) {
            for (const r of userRoleIds) {
                roleIds.push(r.toNumber())
            }
        }
        // get the role details for each unique role id
        const uniqueRoleIds = [...new Set(roleIds)]
        const rolePromises: Promise<SpaceDataTypes.RoleStructOutput>[] = []
        for (const roleId of uniqueRoleIds) {
            rolePromises.push(space.read.getRoleById(roleId))
        }
        const rolesById = await Promise.all(rolePromises)
        // return only roles with details
        for (const r of rolesById) {
            if (
                r &&
                r.roleId.toNumber() !== 0 &&
                // don't include the owner role
                // because all the smart contract func that requires a role
                // forbids the owner role from being touched.
                // Contract calls will revert
                r.name.toLowerCase() !== Permission.Owner.toLowerCase()
            ) {
                roles.push(r)
            }
        }
        return roles
    }

    private async getRoleEntitlements(
        space: SpaceShim,
        entitlementShims: EntitlementShims,
        roleId: number,
    ): Promise<RoleEntitlements> {
        const [roleMetadata, permissions, entitlementDetails] = await Promise.all([
            space.read.getRoleById(roleId),
            space.getPermissionsByRoleId(roleId),
            this.getEntitlementDetails(space, entitlementShims, roleId),
        ])
        return {
            // make sure to return the roleId value from metadata because the role may not exist
            roleId: roleMetadata.roleId.toNumber(),
            name: roleMetadata.name,
            permissions,
            tokens: entitlementDetails.tokens,
            users: entitlementDetails.users,
        }
    }

    private async encodeUpdateChannelRoles(
        space: SpaceShim,
        spaceNetworkId: string,
        channelNetworkId: string,
        _updatedRoleIds: number[],
    ): Promise<BytesLike[]> {
        const encodedCallData: BytesLike[] = []
        // get all the roles in the channel to figure out which roles to add and which to remove
        const roles = await this.getRolesByChannel(spaceNetworkId, channelNetworkId)
        const currentRoleIds = new Set<number>(roles.map((r) => r.roleId.toNumber()))
        const updatedRoleIds = new Set<number>(_updatedRoleIds)
        const rolesToRemove: number[] = []
        const rolesToAdd: number[] = []
        for (const r of updatedRoleIds) {
            // if the current role IDs does not have the updated role ID, then that role should be added.
            if (!currentRoleIds.has(r)) {
                rolesToAdd.push(r)
            }
        }
        for (const r of currentRoleIds) {
            // if the updated role IDs no longer have the current role ID, then that role should be removed.
            if (!updatedRoleIds.has(r)) {
                rolesToRemove.push(r)
            }
        }
        // get all the entitlement modules to figure out the module addresses
        const entitlementModules = await space.read.getEntitlementModules()
        let tokenModuleAddress = ''
        let userModuleAddress = ''
        for (const module of entitlementModules) {
            switch (module.moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    tokenModuleAddress = module.moduleAddress
                    break
                case EntitlementModuleType.UserEntitlement:
                    userModuleAddress = module.moduleAddress
                    break
            }
        }
        // encode the call data for each role to remove
        const encodedRemoveRoles = this.encodeDeleteRolesFromSingleChannel({
            space,
            channelNetworkId,
            roleIds: rolesToRemove,
            tokenModuleAddress,
            userModuleAddress,
        })
        for (const callData of encodedRemoveRoles) {
            encodedCallData.push(callData)
        }
        // encode the call data for each role to add
        const encodedAddRoles = this.encodeAddRolesToSingleChannel({
            space,
            channelNetworkId,
            roleIds: rolesToAdd,
            tokenModuleAddress,
            userModuleAddress,
        })
        for (const callData of encodedAddRoles) {
            encodedCallData.push(callData)
        }
        // make the multi call to update the channel
        return encodedCallData
    }

    private encodeAddRolesToSingleChannel(args: {
        space: SpaceShim
        roleIds: number[]
        channelNetworkId: string
        tokenModuleAddress: string
        userModuleAddress: string
    }): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const roleId of args.roleIds) {
            if (args.tokenModuleAddress) {
                encodedCallData.push(
                    args.space.interface.encodeFunctionData('addRoleToChannel', [
                        args.channelNetworkId,
                        args.tokenModuleAddress,
                        roleId,
                    ]),
                )
            }
            if (args.userModuleAddress) {
                encodedCallData.push(
                    args.space.interface.encodeFunctionData('addRoleToChannel', [
                        args.channelNetworkId,
                        args.userModuleAddress,
                        roleId,
                    ]),
                )
            }
        }
        return encodedCallData
    }

    private encodeDeleteRolesFromSingleChannel(args: {
        space: SpaceShim
        roleIds: number[]
        channelNetworkId: string
        tokenModuleAddress: string
        userModuleAddress: string
    }): BytesLike[] {
        const encodedCallData: BytesLike[] = []
        for (const roleId of args.roleIds) {
            if (args.tokenModuleAddress) {
                encodedCallData.push(
                    args.space.interface.encodeFunctionData('removeRoleFromChannel', [
                        args.channelNetworkId,
                        args.tokenModuleAddress,
                        roleId,
                    ]),
                )
            }
            if (args.userModuleAddress) {
                encodedCallData.push(
                    args.space.interface.encodeFunctionData('removeRoleFromChannel', [
                        args.channelNetworkId,
                        args.userModuleAddress,
                        roleId,
                    ]),
                )
            }
        }
        return encodedCallData
    }
}
