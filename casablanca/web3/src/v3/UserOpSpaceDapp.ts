import { BigNumber, ethers } from 'ethers'
import {
    Presets,
    Client,
    ISendUserOperationResponse,
    UserOperationMiddlewareCtx,
    IUserOperation,
    BundlerJsonRpcProvider,
} from 'userop'
import { z } from 'zod'
import { SpaceDapp } from './SpaceDapp'
import { ITownArchitectBase } from './ITownArchitectShim'
import { getContractsInfo } from '../IStaticContractsInfo'
import { MockERC721AShim } from './MockERC721AShim'
import { PaymasterConfig, UserOpParams, UserOpSpaceDappConfig } from '../UserOpTypes'
import { IUseropSpaceDapp } from '../ISpaceDapp'
import { LOCALHOST_CHAIN_ID } from '../Web3Constants'
// import { estimateGasForLocalBundler } from '../userOpUtils' // for eth-infinitism bundler, probably can remove

type PaymasterProxyResponse = {
    paymasterAndData: string
    preVerificationGas: string
    verificationGasLimit: string
    callGasLimit: string
}

const zSchema: z.ZodType<PaymasterProxyResponse> = z.object({
    paymasterAndData: z.string().startsWith('0x'),
    preVerificationGas: z.string().startsWith('0x'),
    verificationGasLimit: z.string().startsWith('0x'),
    callGasLimit: z.string().startsWith('0x'),
})

type PaymasterProxyPostData = IUserOperation & {
    functionHash: string
    townId: string
}

export class UserOpSpaceDapp extends SpaceDapp implements IUseropSpaceDapp {
    bundlerUrl: string
    rpcUrl: string
    paymasterProxyUrl: string | undefined
    paymasterProxyAuthSecret: string | undefined
    entryPointAddress: string | undefined
    factoryAddress: string | undefined
    mockNFT: MockERC721AShim | undefined
    userOpClient: Client | undefined

    constructor(config: UserOpSpaceDappConfig) {
        const {
            chainId,
            provider,
            bundlerUrl,
            paymasterProxyUrl,
            rpcUrl,
            entryPointAddress,
            factoryAddress,
            paymasterProxyAuthSecret,
        } = config
        super(chainId, provider)
        this.rpcUrl = rpcUrl
        this.bundlerUrl = bundlerUrl ?? rpcUrl
        this.paymasterProxyUrl = paymasterProxyUrl
        this.entryPointAddress = entryPointAddress
        this.factoryAddress = factoryAddress
        this.paymasterProxyAuthSecret = paymasterProxyAuthSecret
        const mockNFTAddress = getContractsInfo(chainId).mockErc721aAddress
        this.mockNFT = new MockERC721AShim(mockNFTAddress, chainId, provider)
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
        const { signer, paymasterConfig } = args
        const paymasterConfigWithDefaults = defaultPaymasterConfig(paymasterConfig)

        const paymasterProxyWithFallbackEstimationMiddleware = async (
            ctx: UserOperationMiddlewareCtx,
        ) => {
            const fallbackEstimate = async () => {
                if (this.provider) {
                    await Presets.Middleware.estimateUserOperationGas(
                        new BundlerJsonRpcProvider(this.rpcUrl).setBundlerRpc(this.bundlerUrl),
                    )(ctx)
                }
            }

            if (!paymasterConfigWithDefaults.usePaymasterProxy) {
                await fallbackEstimate()
                return
            }

            try {
                // ethers.BigNumberish types are:
                // nonce, callGasLimit, verificationGasLimit, preVerificationGas, maxFeePerGas, maxPriorityFeePerGas
                const bigNumberishTypes = [
                    'nonce',
                    'callGasLimit',
                    'verificationGasLimit',
                    'preVerificationGas',
                    'maxFeePerGas',
                    'maxPriorityFeePerGas',
                ] as const

                if (!args.functionHashForPaymasterProxy) {
                    throw new Error('functionHashForPaymasterProxy is required')
                }
                if (!args.townId) {
                    throw new Error('townId is required')
                }
                if (!this.paymasterProxyUrl) {
                    throw new Error('paymasterProxyUrl is required')
                }

                const userOp: PaymasterProxyPostData = {
                    ...ctx.op,
                    functionHash: args.functionHashForPaymasterProxy,
                    townId: args.townId,
                }

                // convert all bigNumberish types to hex strings for paymaster proxy payload
                bigNumberishTypes.forEach((type) => {
                    const value = userOp[type]
                    userOp[type] = BigNumber.from(value).toHexString()
                })

                const sponsorUserOpUrl = `${this.paymasterProxyUrl}/api/sponsor-userop`

                const response = await fetch(sponsorUserOpUrl, {
                    method: 'POST',
                    body: JSON.stringify(userOp),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.paymasterProxyAuthSecret}`,
                    },
                })

                const json = await response.json()
                const parseResult = zSchema.safeParse(json)

                if (!parseResult.success) {
                    throw new Error(
                        `Error parsing PaymasterProxyResponse:: ${JSON.stringify(
                            parseResult.error,
                        )}`,
                    )
                }

                ctx.op.paymasterAndData = parseResult.data.paymasterAndData
                ctx.op.preVerificationGas = parseResult.data.preVerificationGas
                ctx.op.verificationGasLimit = parseResult.data.verificationGasLimit
                ctx.op.callGasLimit = parseResult.data.callGasLimit
            } catch (error: any) {
                // if the paymaster responds with an error
                // just estimate the gas the same way Presets.SimpleAccount does when no paymaster is passed
                // meaning a user will have to pay for gas and this can still fail if they don't have funds
                console.error(
                    'Error getting paymaster proxy response, using fallback gas estimate',
                    error,
                )
                await fallbackEstimate()
            }
        }

        return Presets.Builder.SimpleAccount.init(signer, this.rpcUrl, {
            entryPoint: this.entryPointAddress,
            factory: this.factoryAddress,
            overrideBundlerRpc: this.bundlerUrl,
            // salt?: BigNumberish;
            // nonceKey?: number;
            paymasterMiddleware: paymasterProxyWithFallbackEstimationMiddleware,
        })
    }

    public async getAbstractAccountAddress(args: UserOpParams) {
        return (await this.initBuilder(args)).getSender()
    }

    public async getTown(spaceId: string) {
        const town = await super.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town
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

        const userOp = builder.execute(toAddress, value ?? 0, callData)
        const userOpClient = await this.getUserOpClient()
        return userOpClient.sendUserOperation(userOp, {
            onBuild: (op) => console.log('Signed UserOperation:', op),
        })
    }

    public async getUserOpClient() {
        if (!this.userOpClient) {
            this.userOpClient = await Client.init(this.rpcUrl, {
                entryPoint: this.entryPointAddress,
                overrideBundlerRpc: this.bundlerUrl,
            })
        }
        return this.userOpClient
    }

    public async sendCreateSpaceOp(
        args: Parameters<SpaceDapp['createSpace']>,
        paymasterConfig?: PaymasterConfig,
    ): Promise<ISendUserOperationResponse> {
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

        const functionName = 'createTown'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            this.townRegistrar.TownArchitect.interface,
            functionName,
        )

        const callData = this.townRegistrar.TownArchitect.interface.encodeFunctionData(
            functionName,
            [townInfo],
        )

        try {
            await this.townRegistrar.TownArchitect.write(signer).callStatic.createTown(townInfo)
        } catch (error) {
            throw this.parseSpaceError(createSpaceParams.spaceId, error)
        }
        return this.sendUserOp({
            toAddress: this.townRegistrar.TownArchitect.address,
            callData,
            signer,
            paymasterConfig,
            townId: townInfo.id as string,
            functionHashForPaymasterProxy,
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

    public async sendJoinTownOp(
        args: Parameters<SpaceDapp['joinTown']>,
        paymasterConfig?: PaymasterConfig,
    ): Promise<ISendUserOperationResponse> {
        const [spaceId, recipient, signer] = args
        const town = await this.getTown(spaceId)
        const functionName = 'joinTown'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            town.Membership.interface,
            functionName,
        )

        const callData = town.Membership.interface.encodeFunctionData('joinTown', [recipient])

        try {
            // simulate the tx - throws an error second time you run it!
            await town.Membership.write(signer).callStatic.joinTown(recipient)
        } catch (error) {
            throw this.parseSpaceError(spaceId, error)
        }
        return this.sendUserOp({
            toAddress: town.Address,
            callData,
            signer,
            paymasterConfig,
            townId: (await town.getTownInfo()).networkId as string,
            functionHashForPaymasterProxy,
        })
    }

    /**
     * This method is for running a sanity test, not for app use
     */
    public async sendFunds(args: {
        signer: ethers.Signer
        recipient: string
        value: ethers.BigNumberish
    }): Promise<ISendUserOperationResponse> {
        if (!this.isAnvil()) {
            throw new Error('this method is only for local dev against anvil')
        }
        const { signer, recipient, value } = args
        return this.sendUserOp({
            signer,
            toAddress: recipient,
            callData: '0x',
            value,
            functionHashForPaymasterProxy: '',
            townId: '',
        })
    }

    /**
     * This method is for running a sanity test, not for app use
     */
    public mintMockNFT(args: { signer: ethers.Signer; recipient: string }) {
        if (!this.isAnvil()) {
            throw new Error('this method is only for local dev against anvil')
        }
        const callData = this.mockNFT?.interface.encodeFunctionData('mintTo', [args.recipient])

        return this.sendUserOp({
            signer: args.signer,
            toAddress: this.mockNFT?.address,
            callData: callData,
            value: 0,
            functionHashForPaymasterProxy: '',
            townId: '',
        })
    }

    private isAnvil() {
        return this.chainId === LOCALHOST_CHAIN_ID
    }
}

function defaultPaymasterConfig(config?: PaymasterConfig): PaymasterConfig {
    return {
        usePaymasterProxy: true,
        ...config,
    }
}
