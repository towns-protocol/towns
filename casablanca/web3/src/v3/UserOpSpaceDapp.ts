import { ethers } from 'ethers'
import { Presets, Client, UserOperationMiddlewareFn } from 'userop'
import { SpaceDapp } from './SpaceDapp'
import { ITownArchitectBase } from './ITownArchitectShim'

type UserOpSpaceDappConfig = {
    chainId: number
    provider: ethers.providers.Provider | undefined
    /**
     * Node RPC url
     */
    rpcUrl: string
    /**
     * Optionally route bundler RPC methods to this endpoint. If the bundler and node RPC methods do not share the same rpcUrl, you must provide this. (i.e. local dev, or different node provider than bundler provider)
     * https://docs.stackup.sh/docs/useropjs-provider#bundlerjsonrpcprovider
     */
    bundlerUrl?: string
    /**
     * UserOp client
     */
    userOpClient: Client
    entryPointAddress?: string
    factoryAddress?: string
}

type PaymasterConfig = {
    /**
     * Paymaster URL
     */
    url: string
}

type UserOpParams = {
    toAddress: string
    callData: string
    signer: ethers.Signer
    paymasterConfig?: PaymasterConfig
}

export class UserOpSpaceDapp extends SpaceDapp {
    userOpClient: Client
    bundlerUrl: string
    rpcUrl: string
    entryPointAddress: string | undefined
    factoryAddress: string | undefined

    constructor(config: UserOpSpaceDappConfig) {
        const {
            chainId,
            provider,
            bundlerUrl,
            userOpClient,
            rpcUrl,
            entryPointAddress,
            factoryAddress,
        } = config
        super(chainId, provider)
        this.rpcUrl = rpcUrl
        this.bundlerUrl = bundlerUrl ?? rpcUrl
        this.userOpClient = userOpClient
        this.entryPointAddress = entryPointAddress
        this.factoryAddress = factoryAddress
    }

    public async getTown(spaceId: string) {
        const town = await super.getTown(spaceId)
        if (!town) {
            throw new Error(`Town with spaceId "${spaceId}" is not found.`)
        }
        return town
    }

    public async sendUserOp(args: UserOpParams) {
        const { toAddress, callData, signer, paymasterConfig } = args

        let paymasterMiddleware: UserOperationMiddlewareFn | undefined

        if (paymasterConfig) {
            paymasterMiddleware = Presets.Middleware.verifyingPaymaster(paymasterConfig.url, {
                type: 'payg',
            })
        }

        const simpleAccount = await Presets.Builder.SimpleAccount.init(signer, this.rpcUrl, {
            entryPoint: this.entryPointAddress,
            factory: this.factoryAddress,
            overrideBundlerRpc: this.bundlerUrl,
            // salt?: BigNumberish;
            // nonceKey?: number;
            paymasterMiddleware,
        })

        // TODO: simulate the userOp
        // not sure this is necessary? unless we are getting errors from the bundler we can't decode
        // const op = await this.userOpClient.buildUserOperation(
        //     simpleAccount.execute(toAddress, 0, callData),
        // )
        // await this.userOpClient.entryPoint.simulateHandleOp(op, to, callData)

        return this.userOpClient.sendUserOperation(simpleAccount.execute(toAddress, 0, callData), {
            onBuild: (op) => console.log('Signed UserOperation:', op),
        })
    }

    async sendCreateSpaceOp(
        args: Parameters<SpaceDapp['createSpace']>,
        paymasterConfig?: PaymasterConfig,
    ) {
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

    async sendJoinTownOp(
        args: Parameters<SpaceDapp['joinTown']>,
        paymasterConfig?: PaymasterConfig,
    ) {
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

    static async init(config: Omit<UserOpSpaceDappConfig, 'userOpClient'>) {
        const userOpClient = await Client.init(config.rpcUrl, {
            entryPoint: config.entryPointAddress,
            overrideBundlerRpc: config.bundlerUrl,
        })

        return new UserOpSpaceDapp({
            ...config,
            userOpClient,
        })
    }
}
