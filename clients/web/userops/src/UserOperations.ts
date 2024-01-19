import { Address, ISpaceDapp, ITownArchitectBase, SpaceDapp } from '@river/web3'
import { ethers } from 'ethers'
import { ISendUserOperationResponse, Client as UseropClient, Presets } from 'userop'
import { UserOpsConfig, UserOpParams } from './types'
import { userOpsStore } from './userOpsStore'
// TODO: we can probably add these via @account-abrstraction/contracts if preferred
import { EntryPoint__factory, SimpleAccountFactory__factory } from 'userop/dist/typechain'
import { ERC4337 } from 'userop/dist/constants'

export class UserOps {
    private bundlerUrl: string
    private aaRpcUrl: string
    private paymasterProxyUrl: string | undefined
    // defaults to Stackup's deployed entry point
    private entryPointAddress: string | undefined
    // defaults to Stackup's deployed factory
    private factoryAddress: string | undefined
    private paymasterMiddleware: UserOpsConfig['paymasterMiddleware']
    private userOpClient: UseropClient | undefined
    protected spaceDapp: ISpaceDapp | undefined

    constructor(config: UserOpsConfig & { spaceDapp: ISpaceDapp }) {
        this.bundlerUrl = config.bundlerUrl ?? ''
        this.aaRpcUrl = config.aaRpcUrl
        this.paymasterProxyUrl = config.paymasterProxyUrl
        this.entryPointAddress = config.entryPointAddress ?? ERC4337.EntryPoint
        this.factoryAddress = config.factoryAddress ?? ERC4337.SimpleAccount.Factory
        this.paymasterMiddleware = config.paymasterMiddleware
        this.spaceDapp = config.spaceDapp
    }

    public async getAbstractAccountAddress({ rootKeyAddress }: { rootKeyAddress: Address }) {
        // copied from userop.js
        // easier b/c we don't need the signer, which we don't store
        //
        // alternative to this is calling Presets.Builder.SimpleAccount.init with signer, no paymaster required,
        // which can then call getSenderAddress
        try {
            if (!this.factoryAddress) {
                throw new Error('factoryAddress is required')
            }
            if (!this.entryPointAddress) {
                throw new Error('entryPointAddress is required')
            }
            if (!this.spaceDapp?.provider) {
                throw new Error('spaceDapp is required')
            }

            const initCode = await ethers.utils.hexConcat([
                this.factoryAddress,
                SimpleAccountFactory__factory.createInterface().encodeFunctionData(
                    'createAccount',
                    [
                        rootKeyAddress,
                        // ! salt must match whatever is used in initBuilder. If none, use 0, its the default for userop
                        ethers.BigNumber.from(0),
                    ],
                ),
            ])
            const entryPoint = EntryPoint__factory.connect(
                this.entryPointAddress,
                this.spaceDapp.provider,
            )

            await entryPoint.callStatic.getSenderAddress(initCode)
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const address = error?.errorArgs?.sender
            if (!address) throw error

            userOpsStore.setState({ smartAccountAddress: address })
            return address
        }
    }

    public async getUserOpClient() {
        if (!this.userOpClient) {
            this.userOpClient = await UseropClient.init(this.aaRpcUrl, {
                entryPoint: this.entryPointAddress,
                overrideBundlerRpc: this.bundlerUrl,
            })
        }
        return this.userOpClient
    }

    public async sendUserOp(
        args: UserOpParams & {
            // a function signature hash to pass to paymaster proxy - this is just the function name for now
            functionHashForPaymasterProxy: string
            townId: string
        },
    ): Promise<ISendUserOperationResponse> {
        const { toAddress, callData, value } = args

        const builder = await this.initBuilder(args)

        if (!toAddress) {
            throw new Error('toAddress is required')
        }
        if (!callData) {
            throw new Error('callData is required')
        }
        // local bundler and no paymaster needs to estimate gas
        // MAYBE WE DON'T NEED THIS WITH SKANDHA BUNDLER
        // if (this.chainId === 31337) {
        //     const { preVerificationGas, callGasLimit, verificationGasLimit } =
        //         await estimateGasForLocalBundler({
        //             target: toAddress,
        //             provider: new ethers.providers.JsonRpcProvider(this.rpcUrl),
        //             entryPointAddress: this.entryPointAddress ?? '',
        //             sender: builder.getSender(),
        //             callData,
        //             factoryAddress: this.factoryAddress ?? '',
        //             signer,
        //         })

        //     builder.setPreVerificationGas(preVerificationGas)
        //     builder.setCallGasLimit(callGasLimit)
        //     builder.setVerificationGasLimit(verificationGasLimit)
        // }

        let userOp: Presets.Builder.SimpleAccount
        if (Array.isArray(toAddress)) {
            if (!Array.isArray(callData)) {
                throw new Error('callData must be an array if toAddress is an array')
            }
            if (toAddress.length !== callData.length) {
                throw new Error('toAddress and callData must be the same length')
            }
            userOp = builder.executeBatch(toAddress, callData)
        } else {
            if (Array.isArray(callData)) {
                throw new Error('callData must be a string if toAddress is a string')
            }
            userOp = builder.execute(toAddress, value ?? 0, callData)
        }

        const userOpClient = await this.getUserOpClient()
        return userOpClient.sendUserOperation(userOp, {
            onBuild: (op) => console.log('Signed UserOperation:', op),
        })
    }

    public async sendCreateSpaceOp(
        args: Parameters<SpaceDapp['createSpace']>,
    ): Promise<ISendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [createSpaceParams, signer] = args

        const townInfo: ITownArchitectBase.TownInfoStruct = {
            id: createSpaceParams.spaceId,
            name: createSpaceParams.spaceName,
            uri: createSpaceParams.spaceMetadata,
            membership: createSpaceParams.membership,
            channel: {
                id: createSpaceParams.channelId,
                metadata: createSpaceParams.channelName || '',
            },
        }

        const abstractAccountAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: await getSignerAddress(signer),
        })

        const callDataCreateSpace = this.spaceDapp.townRegistrar.TownArchitect.encodeFunctionData(
            'createTown',
            [townInfo],
        )

        if (await this.spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)) {
            const functionName = 'createTown'

            const functionHashForPaymasterProxy = this.getFunctionSigHash(
                this.spaceDapp.townRegistrar.TownArchitect.interface,
                functionName,
            )

            // TODO: determine if this simulation causes an additional signature in UX
            // try {
            //     await this.townRegistrar.TownArchitect.write(signer).callStatic.createTown(townInfo)
            // } catch (error) {
            //     throw this.parseSpaceError(createSpaceParams.spaceId, error)
            // }

            return this.sendUserOp({
                toAddress: this.spaceDapp.townRegistrar.TownArchitect.address,
                callData: callDataCreateSpace,
                signer,
                townId: townInfo.id as string,
                functionHashForPaymasterProxy,
            })
        }

        // wallet isn't linked, create a user op that both links and creates the town
        const functionName = 'createTown_linkWallet'

        // TODO: this needs to accept an array of names/interfaces
        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            this.spaceDapp.townRegistrar.TownArchitect.interface,
            functionName,
        )

        const callDataLinkWallet = await this.spaceDapp.walletLink.encodeLinkWalletFunctionData(
            signer,
            abstractAccountAddress,
        )

        return this.sendUserOp({
            toAddress: [
                this.spaceDapp.walletLink.address,
                this.spaceDapp.townRegistrar.TownArchitect.address,
            ],
            callData: [callDataLinkWallet, callDataCreateSpace],
            signer,
            townId: townInfo.id as string,
            functionHashForPaymasterProxy,
        })
    }

    public clearStore() {
        userOpsStore.getState().clear()
    }

    public async sendJoinTownOp(
        args: Parameters<SpaceDapp['joinTown']>,
    ): Promise<ISendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [spaceId, recipient, signer] = args
        const town = await this.spaceDapp.getTown(spaceId)

        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }

        const abstractAccountAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: await getSignerAddress(signer),
        })

        const callDataJoinTown = town.Membership.encodeFunctionData('joinTown', [recipient])

        if (await this.spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)) {
            const functionName = 'joinTown'

            const functionHashForPaymasterProxy = this.getFunctionSigHash(
                town.Membership.interface,
                functionName,
            )

            // TODO: determine if this simulation causes an additional signature in UX
            // try {
            //     // simulate the tx - throws an error second time you run it!
            //     await town.Membership.write(signer).callStatic.joinTown(recipient)
            // } catch (error) {
            //     throw this.parseSpaceError(spaceId, error)
            // }

            return this.sendUserOp({
                toAddress: town.Address,
                callData: callDataJoinTown,
                signer,
                townId: (await town.getTownInfo()).networkId as string,
                functionHashForPaymasterProxy,
            })
        }

        // wallet isn't linked, create a user op that both links and joins the town
        const functionName = 'joinTown_linkWallet'

        // TODO: this needs to accept an array of names/interfaces
        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            town.Membership.interface,
            functionName,
        )

        const callDataLinkWallet = await this.spaceDapp.walletLink.encodeLinkWalletFunctionData(
            signer,
            abstractAccountAddress,
        )

        return this.sendUserOp({
            toAddress: [this.spaceDapp.walletLink.address, town.Address],
            callData: [callDataLinkWallet, callDataJoinTown],
            signer,
            townId: (await town.getTownInfo()).networkId as string,
            functionHashForPaymasterProxy,
        })
    }

    // Initialize a builder with middleware based on paymaster config
    //
    // Because we are still determining exactly how we are using paymaster,
    // and userop.js doesn't allow for add/remove a specific middleware from the middleware stack,
    // each user operation can just initiliaze a new builder to make things simpler
    private async initBuilder(
        args: UserOpParams & {
            // a function signature hash to pass to paymaster proxy - this is just the function name for now
            functionHashForPaymasterProxy?: string
            townId?: string
        },
    ) {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const { signer } = args

        return Presets.Builder.SimpleAccount.init(signer, this.aaRpcUrl, {
            entryPoint: this.entryPointAddress,
            factory: this.factoryAddress,
            overrideBundlerRpc: this.bundlerUrl,
            // salt?: BigNumberish;
            // nonceKey?: number;
            paymasterMiddleware: async (ctx) =>
                this.paymasterMiddleware?.({
                    rootKeyAddress: await args.signer.getAddress(),
                    userOpContext: ctx,
                    bundlerUrl: this.bundlerUrl,
                    provider: this.spaceDapp!.provider,
                    aaRpcUrl: this.aaRpcUrl,
                    paymasterProxyUrl: this.paymasterProxyUrl,
                    functionHashForPaymasterProxy: args.functionHashForPaymasterProxy,
                    townId: args.townId,
                }),
        })
    }

    /**
     * should return a matching functionHash as the paymaster proxy validation
     * TODO: convert to same hash as paymaster proxy validation, for now it's just function name
     */
    private getFunctionSigHash<ContractInterface extends ethers.utils.Interface>(
        _contractInterface: ContractInterface,
        functionName: string,
    ) {
        return functionName
        // TODO: swap to this
        // const frag = contractInterface.getFunction(functionName)
        // return frag.format() // format sigHash
    }
}

async function getSignerAddress(signer: ethers.Signer): Promise<Address> {
    const address = await signer.getAddress()
    return address as Address
}
