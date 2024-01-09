import { ethers } from 'ethers'
import { Presets, Client, UserOperationMiddlewareFn, ISendUserOperationResponse } from 'userop'
import { SpaceDapp } from './SpaceDapp'
import { ITownArchitectBase } from './ITownArchitectShim'
import { getContractsInfo } from '../IStaticContractsInfo'
import { MockERC721AShim } from './MockERC721AShim'
import { PaymasterConfig, UserOpParams, UserOpSpaceDappConfig } from '../UserOpTypes'
import { IUseropSpaceDapp } from '../ISpaceDapp'
import { LOCALHOST_CHAIN_ID } from '../Web3Constants'
// import { estimateGasForLocalBundler } from '../userOpUtils' // for eth-infinitism bundler, probably can remove

export class UserOpSpaceDapp extends SpaceDapp implements IUseropSpaceDapp<'v3'> {
    bundlerUrl: string
    rpcUrl: string
    entryPointAddress: string | undefined
    factoryAddress: string | undefined
    mockNFT: MockERC721AShim | undefined
    userOpClient: Client | undefined

    constructor(config: UserOpSpaceDappConfig<'v3'>) {
        const {
            chainId,
            provider,
            bundlerUrl,
            // userOpClient,
            rpcUrl,
            entryPointAddress,
            factoryAddress,
        } = config
        super(chainId, provider)
        this.rpcUrl = rpcUrl
        this.bundlerUrl = bundlerUrl ?? rpcUrl
        this.entryPointAddress = entryPointAddress
        this.factoryAddress = factoryAddress
        const mockNFTAddress = getContractsInfo(chainId).mockErc721aAddress
        this.mockNFT = new MockERC721AShim(mockNFTAddress, chainId, provider)
    }

    // Initialize a builder with middleware based on paymaster config
    //
    // Because we are still determining exactly how we are using paymaster,
    // and userop.js doesn't allow for add/remove a specific middleware from the middleware stack,
    // each user operation can just initiliaze a new builder to make things simpler
    private async initBuilder(args: UserOpParams) {
        const { signer, paymasterConfig } = args

        let paymasterMiddleware: UserOperationMiddlewareFn | undefined

        if (paymasterConfig?.url) {
            paymasterMiddleware = Presets.Middleware.verifyingPaymaster(paymasterConfig.url, {
                type: 'payg',
            })
        }

        return Presets.Builder.SimpleAccount.init(signer, this.rpcUrl, {
            entryPoint: this.entryPointAddress,
            factory: this.factoryAddress,
            overrideBundlerRpc: this.bundlerUrl,
            // salt?: BigNumberish;
            // nonceKey?: number;
            paymasterMiddleware,
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

    public async sendUserOp(args: UserOpParams): Promise<ISendUserOperationResponse> {
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
        const callData = this.townRegistrar.TownArchitect.interface.encodeFunctionData(
            'createTown',
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
        })
    }

    public async sendJoinTownOp(
        args: Parameters<SpaceDapp['joinTown']>,
        paymasterConfig?: PaymasterConfig,
    ): Promise<ISendUserOperationResponse> {
        const [spaceId, recipient, signer] = args
        const town = await this.getTown(spaceId)
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
        })
    }

    private isAnvil() {
        return this.chainId === LOCALHOST_CHAIN_ID
    }
}
