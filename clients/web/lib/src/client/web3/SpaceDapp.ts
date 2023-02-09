import { BigNumber, ContractTransaction, ethers } from 'ethers'
import { EntitlementModule, EntitlementModuleType, Permission, RoleDetails } from './ContractTypes'
import { EventsContractInfo, ISpaceDapp, UpdateRoleParams } from './ISpaceDapp'
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

interface Entitlements {
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

    public async getRole(spaceId: string, roleId: number): Promise<RoleDetails> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        const [role, permissions, entitlementDetails] = await Promise.all([
            space.read.getRoleById(roleId),
            space.getPermissionsByRoleId(roleId),
            this.getEntitlementDetails(space, roleId),
        ])
        const roleName = role.name
        return {
            id: roleId,
            name: roleName,
            permissions: permissions,
            tokens: entitlementDetails.tokens,
            users: entitlementDetails.users,
        }
    }

    public async getRoles(spaceId: string): Promise<SpaceDataTypes.RoleStructOutput[]> {
        const space = await this.getSpace(spaceId)
        if (!space?.read) {
            throw new Error(`Space with networkId "${spaceId}" is not found.`)
        }
        return space.read.getRoles()
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

    public async updateRole(params: UpdateRoleParams): Promise<ContractTransaction> {
        const space = await this.getSpace(params.spaceNetworkId)
        if (!space?.write) {
            throw new Error(
                `Space with networkId "${params.spaceNetworkId}" is not deployed properly.`,
            )
        }
        const encodedCallData: BytesLike[] = []
        // update any role name changes
        const roleDetails = await this.getRole(params.spaceNetworkId, params.roleId)
        if (roleDetails.name !== params.roleName) {
            encodedCallData.push(this.encodeRoleNameChanges(space, params))
        }
        // update any permission changes
        const encodePermissionChanges = this.encodePermissionChanges(space, roleDetails, params)
        for (const p of encodePermissionChanges) {
            encodedCallData.push(p)
        }
        // update any entitlement changes
        const encodeEntitlementChanges = await this.encodeEntitlementChanges(space, params)
        for (const entitlement of encodeEntitlementChanges) {
            encodedCallData.push(entitlement)
        }
        // invoke the multicall transaction
        return space.write.multicall(encodedCallData)
    }

    private encodeRoleNameChanges(space: SpaceShim, params: UpdateRoleParams): string {
        return space.interface.encodeFunctionData('updateRole', [
            BigNumber.from(params.roleId),
            params.roleName,
        ])
    }

    private encodePermissionChanges(
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
        return encodedCallData
    }

    private async encodeEntitlementChanges(
        space: SpaceShim,
        params: UpdateRoleParams,
    ): Promise<BytesLike[]> {
        const encodedCallData: BytesLike[] = []
        // get current entitlements for the role
        const [modules, currentEntitlements] = await Promise.all([
            space.getEntitlementModules(),
            this.getEntitlementDetails(space, params.roleId),
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
        // assembled multi-call data to replace entitlements
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
        return encodedCallData
    }

    private encodeRemoveRoleFromEntitlement(
        space: SpaceShim,
        roleId: number,
        modules: EntitlementModule[],
        entitlements: EntitlementData,
    ): BytesLike[] {
        const data: BytesLike[] = []
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
                            data.push(removeRole)
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
                            data.push(removeRole)
                        }
                    }
                    break
                default:
                    throw new Error(
                        `Unsupported entitlement module type: ${m.moduleType as string}`,
                    )
            }
        }
        return data
    }

    private async getEntitlementDetails(
        space: SpaceShim,
        roleId: number,
    ): Promise<EntitlementData> {
        let rawTokenDetails: TokenDataTypes.ExternalTokenStruct[][] = []
        let rawUserDetails: string[][] = []
        // Get entitlement details.
        const entitlements = await this.createEntitlementShims(space)
        if (entitlements.tokenEntitlement && entitlements.userEntitlement) {
            // Case 1: both token and user entitlements are defined.
            ;[rawTokenDetails, rawUserDetails] = await Promise.all([
                this.getTokenEntitlementDetails(roleId, entitlements.tokenEntitlement),
                this.getUserEntitlementDetails(roleId, entitlements.userEntitlement),
            ])
        } else if (entitlements.tokenEntitlement) {
            // Case 2: only token entitlement is defined.
            rawTokenDetails = await this.getTokenEntitlementDetails(
                roleId,
                entitlements.tokenEntitlement,
            )
        } else if (entitlements.userEntitlement) {
            // Case 3: only user entitlement is defined.
            rawUserDetails = await this.getUserEntitlementDetails(
                roleId,
                entitlements.userEntitlement,
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

    private async createEntitlementShims(space: SpaceShim): Promise<Entitlements> {
        const entitlementAddresses = await space.read.getEntitlements()
        let tokenEntitlement: TokenEntitlementShim | undefined = undefined
        let userEntitlement: UserEntitlementShim | undefined = undefined
        for (const address of entitlementAddresses) {
            const entitlementModule = ShimFactory.createEntitlementModule(
                address,
                this.chainId,
                this.provider,
                this.signer,
            )
            const moduleType = await entitlementModule.read?.moduleType()
            switch (moduleType) {
                case EntitlementModuleType.TokenEntitlement:
                    tokenEntitlement = ShimFactory.createTokenEntitlement(
                        address,
                        space.chainId,
                        space.provider,
                        space.signer,
                    )
                    break
                case EntitlementModuleType.UserEntitlement:
                    userEntitlement = ShimFactory.createUserEntitlement(
                        address,
                        space.chainId,
                        space.provider,
                        space.signer,
                    )
                    break
                default:
                    throw new Error(`Unknown entitlement module type: ${moduleType}`)
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
}
