import {
    Address,
    BaseChainConfig,
    convertRuleDataV2ToV1,
    CreateLegacySpaceParams,
    CreateSpaceParams,
    decodeRuleDataV2,
    IRuleEntitlementV2Base,
    LegacyUpdateRoleParams,
    MembershipStruct,
    Permission,
    SpaceDapp,
    UpdateChannelParams,
    XchainConfig,
} from '@river-build/web3'
import {
    CreateChannelInfo,
    CreateSpaceInfo,
    isUpdateChannelAccessInfo,
    TipParams,
    UpdateChannelInfo,
} from '../types/towns-types'
import {
    BlockchainTransactionType,
    ReceiptType,
    TProvider,
    TransactionOrUserOperation,
    TSigner,
} from '../types/web3-types'
import {
    BanUnbanWalletTransactionContext,
    ChannelTransactionContext,
    ChannelUpdateTransactionContext,
    CreateSpaceFlowStatus,
    CreateSpaceTransactionContext,
    createTransactionContext,
    PrepayMembershipTransactionContext,
    ReviewTransactionContext,
    ReviewTransactionData,
    RoleTransactionContext,
    TipTransactionContext,
    TownsReviewParams,
    TransactionContext,
    TransactionStatus,
    TransferAssetTransactionContext,
    WalletLinkTransactionContext,
} from './TownsClientTypes'
import { BlockchainTransactionStore } from './BlockchainTransactionStore'
import {
    AccountAbstractionConfig,
    getTransactionHashOrUserOpHash,
    isInsufficientTipBalanceException,
    isUserOpResponse,
    UserOps,
} from '@towns/userops'
import { TownsAnalytics } from '../types/TownsAnalytics'
import { getTimeTracker, StartMeasurementReturn, TimeTrackerEvents } from '../SequenceTimeTracker'
import { Hex } from 'viem'
import {
    addCategoryToError,
    getErrorCategory,
    MembershipRejectedError,
    SignerUndefinedError,
    skipErrorDecoding,
} from '../types/error-types'
import { ContractReceipt, ContractTransaction } from 'ethers'
import { toUtf8String } from 'ethers/lib/utils'
import { makeSpaceStreamId, makeUniqueChannelStreamId } from '@river-build/sdk'
import { waitForTimeoutOrMembership } from '../utils/waitForTimeoutOrMembershipEvent'
import { logTxnResult } from './TownsClientTypes'

export class BaseTransactor {
    public userOps: UserOps | undefined = undefined
    public blockchainTransactionStore: BlockchainTransactionStore
    public accountAbstractionConfig: AccountAbstractionConfig | undefined
    public createLegacySpaces: boolean
    public spaceDapp: SpaceDapp
    public baseProvider: TProvider
    public baseConfig: BaseChainConfig

    constructor(args: {
        accountAbstractionConfig: AccountAbstractionConfig | undefined
        baseProvider: TProvider
        baseConfig: BaseChainConfig
        spaceDapp: SpaceDapp
        analytics: TownsAnalytics | undefined
        createLegacySpaces: boolean
    }) {
        const {
            accountAbstractionConfig,
            baseProvider,
            baseConfig,
            spaceDapp,
            analytics,
            createLegacySpaces,
        } = args
        this.blockchainTransactionStore = new BlockchainTransactionStore(spaceDapp)

        if (accountAbstractionConfig) {
            this.accountAbstractionConfig = accountAbstractionConfig
            this.userOps = new UserOps({
                ...accountAbstractionConfig,
                provider: baseProvider,
                config: baseConfig,
                spaceDapp,
                timeTracker: getTimeTracker(analytics),
            })
        }

        this.createLegacySpaces = createLegacySpaces
        this.spaceDapp = spaceDapp
        this.baseProvider = baseProvider
        this.baseConfig = baseConfig
    }

    /************************************************
     * log
     *************************************************/
    protected log(message: string, ...optionalParams: unknown[]) {
        console.log(message, ...optionalParams)
    }

    public isAccountAbstractionEnabled() {
        return !!this.accountAbstractionConfig?.aaRpcUrl
    }

    public getAbstractAccountAddress({ rootKeyAddress }: { rootKeyAddress: Address }) {
        try {
            return this.userOps?.getAbstractAccountAddress({ rootKeyAddress })
        } catch (error) {
            this.log('[getAbstractAccountAddress]', error)
        }
    }

    public async createSpaceTransaction(
        createSpaceInfo: CreateSpaceInfo,
        membership: MembershipStruct,
        signer: TSigner | undefined,
        onCreateSpageFlowStatus?: (status: CreateSpaceFlowStatus) => void,
    ): Promise<CreateSpaceTransactionContext> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        onCreateSpageFlowStatus?.(CreateSpaceFlowStatus.MintingSpace)

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.CreateSpace,
            data: {},
        })

        let senderAddress = await signer.getAddress()

        if (this.isAccountAbstractionEnabled()) {
            const aaAddress = await this.getAbstractAccountAddress({
                rootKeyAddress: senderAddress as Address,
            })
            if (aaAddress) {
                senderAddress = aaAddress
            }
        }

        if (this.createLegacySpaces) {
            this.log('[createCasablancaSpaceTransaction] creating legacy space', createSpaceInfo)
            // Downgrade the request parameters and create a legacy space
            const args: CreateLegacySpaceParams = {
                spaceName: createSpaceInfo.name,
                uri: createSpaceInfo.uri ?? '',
                channelName: createSpaceInfo.defaultChannelName ?? 'general', // default channel name
                membership: {
                    settings: membership.settings,
                    permissions: membership.permissions,
                    requirements: {
                        everyone: membership.requirements.everyone,
                        users: membership.requirements.users,
                        ruleData: convertRuleDataV2ToV1(
                            decodeRuleDataV2(membership.requirements.ruleData as Hex),
                        ),
                        syncEntitlements: membership.requirements.syncEntitlements,
                    },
                },
                shortDescription: createSpaceInfo.shortDescription ?? '',
                longDescription: createSpaceInfo.longDescription ?? '',
            }
            try {
                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendCreateLegacySpaceOp([args, signer])
                } else {
                    transaction = await this.spaceDapp.createLegacySpace(args, signer)
                }
                this.log(`[createCasablancaSpaceTransaction] transaction created` /*, transaction*/)
            } catch (err) {
                console.error('[createCasablancaSpaceTransaction] error', err)
                error = this.getDecodedErrorForSpaceFactory(err)
                addCategoryToError(error, getErrorCategory(err) ?? 'userop')
            }
        } else {
            this.log('[createCasablancaSpaceTransaction] creating v2 space', createSpaceInfo)
            const args: CreateSpaceParams = {
                spaceName: createSpaceInfo.name,
                uri: createSpaceInfo.uri ?? '',
                channelName: createSpaceInfo.defaultChannelName ?? 'general', // default channel name
                membership,
                shortDescription: createSpaceInfo.shortDescription ?? '',
                longDescription: createSpaceInfo.longDescription ?? '',
                prepaySupply: createSpaceInfo.prepaySupply ?? 0,
            }
            try {
                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendCreateSpaceOp([args, signer])
                } else {
                    transaction = await this.spaceDapp.createSpace(args, signer)
                }

                this.log(`[createCasablancaSpaceTransaction] transaction created` /*, transaction*/)
            } catch (err) {
                console.error('[createCasablancaSpaceTransaction] error', err)
                error = this.getDecodedErrorForSpaceFactory(err)
                addCategoryToError(error, getErrorCategory(err) ?? 'userop')
            }
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })
        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      spaceName: createSpaceInfo.name,
                      senderAddress,
                  }
                : undefined,
            error,
        }
    }

    public async createChannelTransaction(
        createChannelInfo: CreateChannelInfo,
        signer: TSigner | undefined,
    ): Promise<ChannelTransactionContext> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        const roomId: string = makeUniqueChannelStreamId(createChannelInfo.parentSpaceId)

        this.log('[createChannelTransaction] Channel created', roomId)

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.CreateChannel,
            data: {
                spaceStreamId: createChannelInfo.parentSpaceId,
                channeStreamId: roomId,
            },
        })

        const args = [
            createChannelInfo.parentSpaceId,
            createChannelInfo.name,
            createChannelInfo.topic ?? '',
            roomId,
            createChannelInfo.roles,
            signer,
        ] as const

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendCreateChannelOp([...args])
            } else {
                transaction = await this.spaceDapp.createChannelWithPermissionOverrides(...args)
            }
            this.log(`[createChannelTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            console.error('[createChannelTransaction] error', err)
            error = this.getDecodedErrorForSpace(createChannelInfo.parentSpaceId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction ? roomId : undefined,
            error,
        }
    }

    public async updateChannelTransaction(
        updateChannelInfo: UpdateChannelInfo,
        signer: TSigner | undefined,
        transactionType:
            | BlockchainTransactionType.DeleteChannel
            | BlockchainTransactionType.EditChannel = BlockchainTransactionType.EditChannel,
    ): Promise<ChannelUpdateTransactionContext> {
        if (!signer) {
            const _error = new Error('signer is undefined')
            console.error('[updateChannelTransaction]', _error)
            return createTransactionContext({
                status: TransactionStatus.Failed,
                error: _error,
            })
        }

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: transactionType,
            data: {
                spaceStreamId: updateChannelInfo.parentSpaceId,
                channeStreamId: updateChannelInfo.channelId,
            },
        })

        try {
            let updateChannelParams: UpdateChannelParams | undefined
            if (isUpdateChannelAccessInfo(updateChannelInfo)) {
                updateChannelParams = {
                    spaceId: updateChannelInfo.parentSpaceId,
                    channelId: updateChannelInfo.channelId,
                    disabled: updateChannelInfo.disabled,
                }
            } else if (updateChannelInfo?.updatedChannelName && updateChannelInfo?.updatedRoleIds) {
                updateChannelParams = {
                    spaceId: updateChannelInfo.parentSpaceId,
                    channelId: updateChannelInfo.channelId,
                    channelName: updateChannelInfo.updatedChannelName,
                    channelDescription: updateChannelInfo.updatedChannelTopic ?? '',
                    roleIds: updateChannelInfo.updatedRoleIds,
                }
            }

            if (updateChannelParams) {
                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendUpdateChannelOp([
                        updateChannelParams,
                        signer,
                    ])
                } else {
                    transaction = await this.spaceDapp.updateChannel(updateChannelParams, signer)
                }
                this.log(`[updateChannelTransaction] transaction created`)
            } else {
                // this is an off chain state update
                this.log(`[updateChannelTransaction] transaction skipped`)
            }
        } catch (err) {
            console.error('[updateChannelTransaction]', err)
            error = this.getDecodedErrorForSpace(updateChannelInfo.parentSpaceId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: !error && transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: updateChannelInfo,
            error,
        })
    }

    public async createRoleTransaction(
        spaceNetworkId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
        signer: TSigner | undefined,
    ): Promise<RoleTransactionContext> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.CreateRole,
            data: {
                spaceStreamId: spaceNetworkId,
                roleName: roleName,
            },
        })

        try {
            const isLegacySpace = await this.spaceDapp.isLegacySpace(spaceNetworkId)
            if (isLegacySpace) {
                const ruleDataV1 = convertRuleDataV2ToV1(ruleData)
                const args = [
                    spaceNetworkId,
                    roleName,
                    permissions,
                    users,
                    ruleDataV1,
                    signer,
                ] as const

                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendLegacyCreateRoleOp([...args])
                } else {
                    transaction = await this.spaceDapp.legacyCreateRole(...args)
                }
            } else {
                const args = [
                    spaceNetworkId,
                    roleName,
                    permissions,
                    users,
                    ruleData,
                    signer,
                ] as const
                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendCreateRoleOp([...args])
                } else {
                    transaction = await this.spaceDapp.createRole(...args)
                }
            }

            this.log(`[createRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceNetworkId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: {
                spaceNetworkId,
                roleId: undefined,
            },
            error,
        }
    }

    public async addRoleToChannelTransaction(
        spaceNetworkId: string,
        channelNetworkId: string,
        roleId: number,
        signer: TSigner | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: ContractTransaction | undefined = undefined
        let error: Error | undefined = undefined
        this.log('[addRoleToChannelTransaction] space', {
            spaceNetworkId,
            channelNetworkId,
            roleId,
        })
        try {
            transaction = await this.spaceDapp.addRoleToChannel(
                spaceNetworkId,
                channelNetworkId,
                roleId,
                signer,
            )
            this.log(`[addRoleToChannelTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceNetworkId, err)
        }

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: undefined,
            error,
        }
    }

    public async updateSpaceInfoTransaction(
        spaceNetworkId: string,
        name: string,
        uri: string,
        shortDescription: string,
        longDescription: string,
        signer: TSigner | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.UpdateSpaceInfo,
            data: {
                spaceStreamId: spaceNetworkId,
            },
        })
        try {
            const spaceInfo = await this.spaceDapp.getSpaceInfo(spaceNetworkId)
            // default space uris === '' but there's a contract check that will revert if uri is < 1 char
            // See SpaceOwnerBase.sol _updateSpace()
            // also uri is being passed in as undefined somehow
            // https://linear.app/hnt-labs/issue/TOWNS-11977/revisit-space-uri-in-updating-a-town
            const _inUri = uri?.length > 0 ? uri : undefined
            const _currentUri = spaceInfo && spaceInfo.uri?.length > 0 ? spaceInfo.uri : ' '

            const args = [
                spaceNetworkId,
                name,
                _inUri ?? _currentUri,
                shortDescription ?? spaceInfo?.shortDescription ?? '',
                longDescription ?? spaceInfo?.longDescription ?? '',
                signer,
            ] as const
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendUpdateSpaceInfoOp([...args])
            } else {
                transaction = await this.spaceDapp.updateSpaceInfo(...args)
            }
            this.log(`[updateSpaceInfoTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceNetworkId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async refreshMetadataTransaction(
        spaceNetworkId: string,
        signer: TSigner | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.RefreshMetadata,
            data: {
                spaceStreamId: spaceNetworkId,
            },
        })
        try {
            const args = [spaceNetworkId, signer] as const
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.refreshMetadata([...args])
            } else {
                transaction = await this.spaceDapp.refreshMetadata(...args)
            }
            this.log(`[refreshMetadataTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceNetworkId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    /**
     * This function is used to edit the membership settings of a space.
     * With account abstraciton enabled, it consists of multiple transactions that are combined into a single user operation.
     * Without account abstraction, it is a single transaction that should only update the minter role
     */
    public async editSpaceMembershipTransaction(
        args: Parameters<UserOps['sendEditMembershipSettingsOp']>['0'],
    ): Promise<TransactionContext<void>> {
        const { spaceId, updateRoleParams, membershipParams, signer } = args
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.EditSpaceMembership,
            data: {
                spaceStreamId: spaceId,
            },
        })

        try {
            const isLegacySpace = await this.spaceDapp.isLegacySpace(args.spaceId)
            if (isLegacySpace) {
                const legacyUpdateRoleParams = {
                    ...updateRoleParams,
                    ruleData: convertRuleDataV2ToV1(updateRoleParams.ruleData),
                } as LegacyUpdateRoleParams

                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendLegacyEditMembershipSettingsOp({
                        spaceId,
                        legacyUpdateRoleParams,
                        membershipParams,
                        signer,
                    })
                } else {
                    transaction = await this.spaceDapp.legacyUpdateRole(
                        legacyUpdateRoleParams,
                        signer,
                    )
                }
            } else {
                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendEditMembershipSettingsOp({
                        spaceId,
                        updateRoleParams,
                        membershipParams,
                        signer,
                    })
                } else {
                    transaction = await this.spaceDapp.updateRole(updateRoleParams, signer)
                }
            }

            this.log(`[updateRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceId, err)
        }
        // todo: add necessary contextual data
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async updateRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
        signer: TSigner | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.UpdateRole,
            data: {
                spaceStreamId: spaceNetworkId,
                roleName,
            },
        })

        try {
            const isLegacySpace = await this.spaceDapp.isLegacySpace(spaceNetworkId)
            if (isLegacySpace) {
                const args = {
                    spaceNetworkId,
                    roleId,
                    roleName,
                    permissions,
                    users,
                    ruleData: convertRuleDataV2ToV1(ruleData),
                }
                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendLegacyUpdateRoleOp([args, signer])
                } else {
                    transaction = await this.spaceDapp.legacyUpdateRole(args, signer)
                }
            } else {
                const args = {
                    spaceNetworkId,
                    roleId,
                    roleName,
                    permissions,
                    users,
                    ruleData,
                }
                if (this.isAccountAbstractionEnabled()) {
                    transaction = await this.userOps?.sendUpdateRoleOp([args, signer])
                } else {
                    transaction = await this.spaceDapp.updateRole(args, signer)
                }
            }

            this.log(`[updateRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceNetworkId, err)
        }
        // todo: add necessary contextual data
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async setChannelPermissionOverridesTransaction(
        spaceNetworkId: string,
        channelId: string,
        roleId: number,
        permissions: Permission[],
        signer: TSigner | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.SetChannelPermissionOverrides,
            data: {
                spaceStreamId: spaceNetworkId,
                roleId,
            },
        })

        try {
            const args = {
                spaceNetworkId,
                roleId,
                channelId,
                permissions,
            }

            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendSetChannelPermissionOverridesOp([
                    args,
                    signer,
                ])
            } else {
                transaction = await this.spaceDapp.setChannelPermissionOverrides(args, signer)
            }

            this.log(
                `[setChannelPermissionOverridesTransaction] transaction created` /*, transaction*/,
            )
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceNetworkId, err)
        }
        // todo: add necessary contextual data
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async clearChannelPermissionOverridesTransaction(
        spaceNetworkId: string,
        channelId: string,
        roleId: number,
        signer: TSigner | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.ClearChannelPermissionOverrides,
            data: {
                spaceStreamId: spaceNetworkId,
                roleId,
                channelId,
            },
        })

        try {
            const args = {
                spaceNetworkId,
                roleId,
                channelId,
            }

            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendClearChannelPermissionOverridesOp([
                    args,
                    signer,
                ])
            } else {
                transaction = await this.spaceDapp.clearChannelPermissionOverrides(args, signer)
            }

            this.log(
                `[setChannelPermissionOverridesTransaction] transaction created` /*, transaction*/,
            )
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceNetworkId, err)
        }

        // todo: add necessary contextual data
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    public async banTransaction(
        spaceId: string,
        userId: string,
        signer: TSigner,
    ): Promise<BanUnbanWalletTransactionContext> {
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        this.log('[banUserTransaction] space', { spaceId, userId })

        const walletAddressWithToken = await this.walletAddressForMembership(spaceId, userId)
        if (!walletAddressWithToken) {
            throw new Error('Membership token not found')
        }

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.BanUser,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendBanWalletAddressOp([
                    spaceId,
                    walletAddressWithToken,
                    signer,
                ])
            } else {
                transaction = await this.spaceDapp.banWalletAddress(
                    spaceId,
                    walletAddressWithToken,
                    signer,
                )
            }
            this.log(`[banTransaction] transaction created`)
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: { spaceId, userId, isBan: true },
            error,
        }
    }

    public async unbanTransaction(
        spaceId: string,
        userId: string,
        signer: TSigner,
    ): Promise<BanUnbanWalletTransactionContext> {
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        this.log('[unbanUserTransaction] space', { spaceId, userId })
        const walletAddressWithToken = await this.walletAddressForMembership(spaceId, userId)
        if (!walletAddressWithToken) {
            throw new Error('Membership token not found')
        }

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.UnbanUser,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendUnbanWalletAddressOp([
                    spaceId,
                    walletAddressWithToken,
                    signer,
                ])
            } else {
                transaction = await this.spaceDapp.unbanWalletAddress(
                    spaceId,
                    walletAddressWithToken,
                    signer,
                )
            }
            this.log(`[unbanTransaction] transaction created`)
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: { spaceId, userId, isBan: false },
            error,
        }
    }

    public async deleteRoleTransaction(
        spaceNetworkId: string,
        roleId: number,
        signer: TSigner | undefined,
    ): Promise<TransactionContext<void>> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.DeleteRole,
            data: {
                spaceStreamId: spaceNetworkId,
            },
        })
        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendDeleteRoleOp([spaceNetworkId, roleId, signer])
            } else {
                transaction = await this.spaceDapp.deleteRole(spaceNetworkId, roleId, signer)
            }
            this.log(`[deleteRoleTransaction] transaction created` /*, transaction*/)
        } catch (err) {
            error = this.getDecodedErrorForSpace(spaceNetworkId, err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext({
            transaction,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            error,
        })
    }

    /************************************************
     * setSpaceAccess
     *************************************************/
    public async setSpaceAccess(
        spaceNetworkId: string,
        disabled: boolean,
        signer: TSigner | undefined,
    ): Promise<boolean> {
        if (!signer) {
            throw new SignerUndefinedError()
        }
        let transaction: ContractTransaction | undefined = undefined
        let receipt: ContractReceipt | undefined = undefined
        let success = false
        try {
            transaction = await this.spaceDapp.setSpaceAccess(spaceNetworkId, disabled, signer)
            receipt = await transaction.wait()
        } catch (err) {
            const decodedError = this.getDecodedErrorForSpace(spaceNetworkId, err)
            console.error('[setSpaceAccess] failed', decodedError)
            throw decodedError
        } finally {
            if (receipt?.status === 1) {
                this.log('[setSpaceAccess] successful')
                success = true
            } else {
                console.error('[setSpaceAccess] failed')
            }
        }
        return success
    }

    /************************************************
     * mintMembershipTransaction
     *************************************************/
    public async mintMembershipTransaction(args: {
        spaceId: string
        signer: TSigner
        xchainConfig: XchainConfig
    }) {
        const { spaceId, signer, xchainConfig } = args
        this.log('[mintMembershipTransaction] start')

        const rootWallet = (await signer?.getAddress()) ?? ''
        let transaction: TransactionOrUserOperation | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.JoinSpace,
        })

        const timeTracker = getTimeTracker()
        try {
            const endGetEndtitledWallet = timeTracker.startMeasurement(
                TimeTrackerEvents.JOIN_SPACE,
                'userops_get_entitled_wallet',
            )
            const entitledWallet = await this.spaceDapp.getEntitledWalletForJoiningSpace(
                spaceId,
                rootWallet,
                xchainConfig,
            )
            endGetEndtitledWallet?.()

            if (!entitledWallet) {
                console.error('[mintMembershipTransaction] failed, no wallets have balance')
                const err = new Error('execution reverted')
                err.name = 'Entitlement__NotAllowed'
                continueStoreTx({
                    hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
                    transaction,
                    error: err,
                })
                throw err
            }

            const hasMembership = await this.spaceDapp.hasSpaceMembership(spaceId, entitledWallet)

            if (hasMembership) {
                return
            }

            let membershipListener: Promise<
                | {
                      issued: true
                      tokenId: string
                  }
                | {
                      issued: false
                      tokenId: undefined
                  }
            >

            const abortController = new AbortController()

            if (this.isAccountAbstractionEnabled()) {
                // i.e. when a non gated town is joined
                // recipients should always be the smart account address
                let recipient: string | undefined = entitledWallet
                if (recipient.toLowerCase() === rootWallet.toLowerCase()) {
                    recipient = await this.getAbstractAccountAddress({
                        rootKeyAddress: recipient as Address,
                    })
                }
                if (!recipient) {
                    throw new Error('Abstract account address not found')
                }
                membershipListener = this.spaceDapp.listenForMembershipEvent(
                    spaceId,
                    recipient,
                    abortController,
                )
                transaction = await this.userOps?.sendJoinSpaceOp([spaceId, recipient, signer])
            } else {
                // joinSpace when called directly sets up the membershipListener
                membershipListener = this.spaceDapp.joinSpace(spaceId, entitledWallet, signer)
            }

            const membershipOrTimeout = waitForTimeoutOrMembership({
                hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
                membershipListener,
                abortController,
            })

            continueStoreTx({
                hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
                transaction,
                eventListener: {
                    wait: async (): Promise<{
                        success: boolean
                        [x: string]: unknown
                    }> => {
                        const { issued, tokenId } = await membershipOrTimeout
                        return {
                            success: issued,
                            tokenId,
                        }
                    },
                },
                error: undefined,
            })

            this.log(
                `[mintMembershipTransaction] transaction created, starting membershipListener`,
                {
                    transaction,
                },
            )

            const endWaitForMembership = timeTracker.startMeasurement(
                TimeTrackerEvents.JOIN_SPACE,
                'contract_wait_for_membership_issued',
                {
                    userOpHash: getTransactionHashOrUserOpHash(transaction),
                },
            )
            const { issued, tokenId, error } = await membershipOrTimeout
            endWaitForMembership?.()

            this.log('[mintMembershipTransaction] membershipListener result', issued, tokenId)

            if (error) {
                throw error
            }

            if (!issued) {
                throw new MembershipRejectedError()
            }
        } catch (error) {
            console.error('[mintMembershipTransaction] failed', error)
            let decodeError: Error
            if (error instanceof MembershipRejectedError) {
                decodeError = error
            } else {
                decodeError = this.getDecodedErrorForSpace(spaceId, error)
            }
            console.error('[mintMembershipAndJoinRoom] failed', decodeError)
            continueStoreTx({
                hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
                transaction,
                error: decodeError,
            })
            throw decodeError
        }
    }

    public async prepayMembershipTransaction(
        spaceId: string,
        supply: number,
        signer: TSigner,
    ): Promise<PrepayMembershipTransactionContext> {
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.PrepayMembership,
            data: {
                supply,
            },
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendPrepayMembershipOp([spaceId, supply, signer])
            } else {
                transaction = await this.spaceDapp.prepayMembership(spaceId, supply, signer)
            }
            this.log(`[linkEOAToRootKey] transaction created` /*, transaction*/)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: unknown) {
            error = this.getDecodedErrorForSpace(spaceId, err)
        }
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: { spaceId: spaceId, supply },
            error,
        }
    }

    public async transferAsset(
        transferData: NonNullable<TransferAssetTransactionContext['data']>,
        signer: TSigner,
    ): Promise<TransferAssetTransactionContext | undefined> {
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        let type: BlockchainTransactionType | undefined = undefined
        if (transferData.spaceAddress) {
            type = BlockchainTransactionType.WithdrawTreasury
        } else if (transferData.value) {
            type = BlockchainTransactionType.TransferBaseEth
        } else if (transferData.contractAddress && transferData.tokenId) {
            type = BlockchainTransactionType.TransferNft
        }

        if (!type) {
            throw new Error('Invalid transfer data')
        }

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type,
            data: transferData,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                if (transferData.spaceAddress) {
                    const spaceId = makeSpaceStreamId(transferData.spaceAddress)
                    transaction = await this.userOps?.sendWithdrawSpaceFundsOp([
                        spaceId,
                        transferData.recipient,
                        signer,
                    ])
                } else if (transferData.value) {
                    transaction = await this.userOps?.sendTransferEthOp(
                        {
                            recipient: transferData.recipient,
                            value: transferData.value,
                        },
                        signer,
                    )
                } else if (transferData.contractAddress && transferData.tokenId) {
                    transaction = await this.userOps?.sendTransferAssetsOp(
                        {
                            contractAddress: transferData.contractAddress,
                            recipient: transferData.recipient,
                            tokenId: transferData.tokenId,
                        },
                        signer,
                    )
                }
            }
        } catch (err) {
            if (transferData.spaceAddress) {
                const spaceId = makeSpaceStreamId(transferData.spaceAddress)
                error = this.getDecodedErrorForSpace(spaceId, err)
            } else {
                error = err as Error
            }
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
            eventListener: {
                wait: async (): Promise<{
                    success: boolean
                    [x: string]: unknown
                }> => {
                    if (isUserOpResponse(transaction)) {
                        const result = await transaction?.getUserOperationReceipt()
                        return {
                            receipt: result?.receipt,
                            success: result?.success ?? false,
                        }
                    }
                    return {
                        success: false,
                    }
                },
            },
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction ? transferData : undefined,
            error,
        }
    }

    private async walletAddressForMembership(
        spaceId: string,
        walletAddress: string,
    ): Promise<string | undefined> {
        const wallets = (await this.getLinkedWallets(walletAddress)).concat(walletAddress)
        for (const walletAddress of wallets) {
            if (await this.spaceDapp.hasSpaceMembership(spaceId, walletAddress)) {
                return walletAddress
            }
        }
        return undefined
    }

    /************************************************
     * Wallet linking
     */
    public async linkEOAToRootKey(
        rootKey: TSigner,
        wallet: TSigner,
    ): Promise<WalletLinkTransactionContext> {
        const rootKeyAddress = await rootKey.getAddress()
        const walletAddress = await wallet.getAddress()
        const walletLink = this.spaceDapp.getWalletLink()

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.LinkWallet,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendLinkEOAToRootKeyOp([rootKey, wallet])
            } else {
                transaction = await walletLink.linkWalletToRootKey(rootKey, wallet)
            }
            this.log(`[linkEOAToRootKey] transaction created` /*, transaction*/)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            const parsedError = walletLink.parseError(err)
            error = parsedError
        }
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      rootKeyAddress,
                      walletAddress,
                  }
                : undefined,
            error,
        }
    }

    /**
     * Link the caller of the tx to the root key. For now, this is used to link a smart account to a root key.
     * @param rootKey
     * @param wallet - optional because if it's a user op, we only need the root key
     * @returns
     */
    public async linkCallerToRootKey(
        rootKey: TSigner,
        wallet?: TSigner,
    ): Promise<WalletLinkTransactionContext> {
        const rootKeyAddress = await rootKey.getAddress()
        let walletAddress = ''
        const walletLink = this.spaceDapp.getWalletLink()

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.LinkWallet,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                walletAddress =
                    (await this.getAbstractAccountAddress({
                        rootKeyAddress: rootKeyAddress as Address,
                    })) ?? ''
                if (!walletAddress || walletAddress === '') {
                    throw new Error('Abstract account address not found')
                }
                // when account abstraction is enabled, the only time we should be using this method is when linking a smart account to a root key
                if (wallet) {
                    throw new Error(
                        '[linkCallerToRootKey] wallet address should not be provided when account abstraction is enabled',
                    )
                }
                transaction = await this.userOps?.sendLinkSmartAccountToRootKeyOp(
                    rootKey,
                    walletAddress as Address,
                )
            } else {
                if (!wallet) {
                    throw new Error(
                        '[linkCallerToRootKey] wallet address must be provided when account abstraction is disabled',
                    )
                }
                walletAddress = await wallet.getAddress()
                transaction = await walletLink.linkCallerToRootKey(rootKey, wallet)
            }
            this.log(`[linkCallerToRootKey] transaction created` /*, transaction*/)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            const parsedError = walletLink.parseError(err)
            error = parsedError
        }
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      rootKeyAddress,
                      walletAddress,
                  }
                : undefined,
            error,
        }
    }

    public async unlinkViaRootKey(
        rootKey: TSigner,
        walletAddress: string,
    ): Promise<WalletLinkTransactionContext> {
        const walletLink = this.spaceDapp.getWalletLink()

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.UnlinkWallet,
        })

        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendRemoveWalletLinkOp([rootKey, walletAddress])
            } else {
                transaction = await walletLink.removeLink(rootKey, walletAddress)
            }
        } catch (err) {
            const parsedError = walletLink.parseError(err)
            error = parsedError
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      rootKeyAddress: await rootKey.getAddress(),
                      walletAddress,
                  }
                : undefined,
            error,
        }
    }

    public async unlinkViaCaller(caller: TSigner): Promise<WalletLinkTransactionContext> {
        const walletLink = this.spaceDapp.getWalletLink()

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.UnlinkWallet,
        })

        try {
            transaction = await walletLink.removeCallerLink(caller)
        } catch (err) {
            const parsedError = walletLink.parseError(err)
            error = parsedError
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: transaction
                ? {
                      walletAddress: await caller.getAddress(),
                  }
                : undefined,
            error,
        }
    }

    public async getLinkedWallets(walletAddress: string): Promise<string[]> {
        const walletLink = this.spaceDapp.getWalletLink()
        return await walletLink.getLinkedWallets(walletAddress)
    }

    public async getRootKeyFromLinkedWallet(walletAddress: string): Promise<string> {
        const walletLink = this.spaceDapp.getWalletLink()
        return await walletLink.getRootKeyForWallet(walletAddress)
    }

    public async waitForBlockchainTransaction<TxnContext>(
        context: TransactionContext<TxnContext> | undefined,
        sequenceName?: TimeTrackerEvents,
        confirmations?: number,
    ): Promise<TransactionContext<TxnContext>> {
        if (!context?.transaction) {
            return createTransactionContext<TxnContext>({
                status: TransactionStatus.Failed,
                error: new Error(`[_waitForBlockchainTransaction] transaction is undefined`),
            })
        }

        let transaction: TransactionOrUserOperation | undefined = undefined
        let receipt: ReceiptType | undefined = undefined
        let error: Error | undefined = undefined

        transaction = context.transaction

        try {
            if (isUserOpResponse(transaction)) {
                let endWaitForUserOpReceipt: ((endSequence?: boolean) => void) | undefined
                if (sequenceName) {
                    endWaitForUserOpReceipt = getTimeTracker().startMeasurement(
                        sequenceName,
                        'userops_wait_for_user_operation_receipt',
                        {
                            userOpHash: transaction.userOpHash,
                        },
                    )
                }

                const userOpReceipt = await transaction.getUserOperationReceipt()

                if (endWaitForUserOpReceipt) {
                    endWaitForUserOpReceipt()
                }

                if (userOpReceipt) {
                    if (userOpReceipt.success === false) {
                        // TODO: parse the user operation error
                        throw new Error(
                            `[_waitForBlockchainTransaction] user operation was not successful`,
                        )
                    }

                    let endWaitForTxConfirmation: StartMeasurementReturn | undefined
                    // we probably don't need to wait for this transaction, but for now we can convert it to a receipt for less refactoring
                    if (sequenceName) {
                        endWaitForTxConfirmation = getTimeTracker().startMeasurement(
                            sequenceName,
                            'userops_wait_for_ethers_receipt',
                        )
                    }
                    receipt = await this.baseProvider?.waitForTransaction(
                        userOpReceipt.receipt?.transactionHash,
                        confirmations,
                    )
                    if (endWaitForTxConfirmation) {
                        endWaitForTxConfirmation()
                    }
                } else {
                    throw new Error(`[_waitForBlockchainTransaction] userOpEvent is undefined`)
                }
            } else {
                receipt = await this.baseProvider?.waitForTransaction(transaction.hash)
            }

            if (receipt?.status === 1) {
                this.log('receipt', receipt)
                return createTransactionContext({
                    status: TransactionStatus.Success,
                    transaction,
                    data: context.data,
                    receipt,
                })
            } else if (receipt?.status === 0) {
                await this.throwTransactionError(receipt)
            } else {
                throw new Error(
                    `[_waitForBlockchainTransaction] failed because receipt.status is undefined`,
                )
            }
        } catch (err) {
            if (err instanceof Error) {
                error = err
            } else {
                error = new Error(`$[_waitForBlockchainTransaction] failed: ${JSON.stringify(err)}`)
            }
        }

        // got here without success
        return createTransactionContext({
            status: TransactionStatus.Failed,
            transaction,
            receipt,
            error,
        })
    }

    public async tipTransaction(args: TipParams): Promise<TipTransactionContext> {
        const { signer, receiverTokenId, receiverUsername, receiverUserId, ...tipArgs } = args
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        const txContextData = {
            receiverUsername,
            spaceId: tipArgs.spaceId,
            senderAddress: tipArgs.senderAddress,
            messageId: tipArgs.messageId,
            channelId: tipArgs.channelId,
            receiverUserId,
            amount: tipArgs.amount,
            currency: tipArgs.currency,
        }
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.Tip,
            data: txContextData,
        })

        // Ensure the string only contains valid hex characters
        if (!/^[0-9a-fA-F]*$/.test(args.messageId)) {
            throw new Error('Invalid hex string for messageId')
        }
        // Convert to bytes
        const formattedArgs = {
            ...tipArgs,
            messageId: `0x${args.messageId}`,
            channelId: `0x${args.channelId}`,
            receiver: args.receiverAddress,
            tokenId: receiverTokenId,
        }
        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendTipOp([formattedArgs, signer])
            } else {
                transaction = await this.spaceDapp.tip(formattedArgs, signer)
            }
            this.log(`[linkEOAToRootKey] transaction created` /*, transaction*/)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: unknown) {
            error = isInsufficientTipBalanceException(err)
                ? err
                : this.getDecodedErrorForSpace(tipArgs.spaceId, err)
        }
        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: txContextData,
            error,
        }
    }

    public async checkInTransaction(signer: TSigner): Promise<TransactionContext<void>> {
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.CheckIn,
        })
        try {
            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendCheckInOp([signer])
            } else {
                transaction = await this.spaceDapp?.airdrop?.checkIn(signer)
            }
            this.log(`[check in] transaction created`)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: unknown) {
            error = this.getDecodedErrorForRiverPoints(err)
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })
        //
        return {
            transaction,
            receipt: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
            data: undefined,
            error,
        }
    }

    public async sendTokenTransferOperationWithCallData(
        args: {
            value: bigint
            signer: TSigner
        } & ({ callData: string; toAddress: string } | { callData: string[]; toAddress: string[] }),
    ): Promise<TransactionContext<void>> {
        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined
        if (!this.isAccountAbstractionEnabled()) {
            throw new Error('sendTokenTransferOperationWithCallData requires account abstraction')
        }

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.Trade,
        })

        try {
            transaction = await this.userOps?.sendTokenTransferOperationWithCallData(args)
            this.log(`[userOperation with calldata] transaction created`)
        } catch (err) {
            error = this.tryDecodeError(
                err,
                `[sendTokenTransferOperationWithCallData] cannot decode error`,
            )
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error: error,
        })

        return {
            transaction,
            receipt: undefined,
            data: undefined,
            status: transaction ? TransactionStatus.Pending : TransactionStatus.Failed,
        }
    }

    /*
     * Error when baseProvider.waitForTransaction receipt has a status of 0
     */
    private async throwTransactionError(receipt: ContractReceipt): Promise<Error> {
        try {
            const code = await this.baseProvider?.call(receipt, receipt.blockNumber)
            const reason = toUtf8String(`0x${code?.substring(138) || ''}`)
            throw new Error(reason)
        } catch (error) {
            // This might be causing issues https://github.com/foundry-rs/foundry/issues/4843
            // and hopefully this provides a little better error message
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const deepMessage = error.error?.error?.message as string | undefined
            if (deepMessage) {
                throw new Error(deepMessage)
            }
            throw error
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getDecodedErrorForSpace(spaceId: string, error: any): Error {
        if (skipErrorDecoding(error)) {
            return error
        }
        try {
            // parseSpaceError needs to be rewritten to return actual errors
            const fakeError = this.spaceDapp.parseSpaceError(spaceId, error)
            const realError = new Error(fakeError.message)
            realError.name = fakeError.name
            if ('code' in error) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                realError.code = error.code
            }
            return realError
        } catch (e: unknown) {
            return this.tryDecodeError(e, `[getDecodedErrorForSpace] cannot decode error`)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getDecodedErrorForSpaceFactory(error: any): Error {
        if (skipErrorDecoding(error)) {
            return error
        }
        try {
            return this.spaceDapp.parseSpaceFactoryError(error)
        } catch (e: unknown) {
            return this.tryDecodeError(e, `[getDecodedErrorForSpaceFactory] cannot decode error`)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getDecodedErrorForRiverPoints(error: any): Error | undefined {
        if (skipErrorDecoding(error)) {
            return error
        }
        try {
            return this.spaceDapp.airdrop?.riverPoints?.parseError(error)
        } catch (e: unknown) {
            return this.tryDecodeError(e, `[getDecodedErrorForRiverPoints] cannot decode error`)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private tryDecodeError(e: unknown, defaultText: string): Error {
        if (e instanceof Error) {
            return e
        }
        if (
            typeof e === 'object' &&
            e !== null &&
            'name' in e &&
            typeof e.name === 'string' &&
            'message' in e &&
            typeof e.message === 'string' &&
            e.message !== undefined
        ) {
            const newErr = new Error(e.message)
            newErr.name = e.name
            if ('code' in e) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                newErr.code = e.code
            }
            return newErr
        } else {
            return new Error(defaultText)
        }
    }

    public async reviewTransaction(
        args: [TownsReviewParams, TSigner],
    ): Promise<ReviewTransactionContext> {
        const [reviewParams, signer] = args

        let transaction: TransactionOrUserOperation | undefined = undefined
        let error: Error | undefined = undefined

        const continueStoreTx = this.blockchainTransactionStore.begin({
            type: BlockchainTransactionType.Review,
            data: { ...reviewParams },
        })

        try {
            // Let the contract enforce membership
            this.log('[reviewTransaction] submitting review', reviewParams)

            if (this.isAccountAbstractionEnabled()) {
                transaction = await this.userOps?.sendReviewOp(args)
            } else {
                const space = this.spaceDapp.getSpace(reviewParams.spaceId)
                if (!space) {
                    throw new Error(`Space with spaceId "${reviewParams.spaceId}" is not found.`)
                }

                if (reviewParams.isDelete) {
                    transaction = await space.Review.deleteReview(signer)
                } else {
                    transaction = reviewParams.isUpdate
                        ? await space.Review.updateReview(reviewParams, signer)
                        : await space.Review.addReview(reviewParams, signer)
                }
            }
            this.log(`[reviewTransaction] transaction created`)
        } catch (err) {
            this.log('[reviewTransaction] error', err)
            error = this.tryDecodeError(err, 'Failed to submit review')
        }

        continueStoreTx({
            hashOrUserOpHash: getTransactionHashOrUserOpHash(transaction),
            transaction,
            error,
        })

        return createTransactionContext<ReviewTransactionData>({
            status: error ? TransactionStatus.Failed : TransactionStatus.Pending,
            transaction,
            data: reviewParams,
            error,
        })
    }

    public async waitForReviewTransaction(
        context: TransactionContext<void> | undefined,
    ): Promise<TransactionContext<void>> {
        const txnContext = await this.waitForBlockchainTransaction(context)
        logTxnResult('waitForReviewTransaction', txnContext)
        return txnContext
    }
}
