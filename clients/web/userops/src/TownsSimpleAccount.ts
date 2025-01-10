import { Signer, constants, BigNumberish, BytesLike } from 'ethers'
import {
    BundlerJsonRpcProvider,
    IPresetBuilderOpts,
    UserOperationBuilder,
    UserOperationMiddlewareFn,
} from 'userop'
import {
    EntryPoint,
    EntryPoint__factory,
    SimpleAccount as SimpleAccountImpl,
    SimpleAccount__factory,
    SimpleAccountFactory,
    SimpleAccountFactory__factory,
} from 'userop/dist/typechain'
import { ERC4337 } from './constants'
import { getInitData, getSignature } from './workers'
interface ISigner extends Pick<Signer, 'signMessage'> {}
type EOASigner = ISigner & Pick<Signer, 'getAddress'>

/**
 * Mostly a copy of SimpleAccount Builder Prest from userop.js
 * With the following changes:
 * - removes some of the middleware that was set up in the init function - gas fee estimation, paymaster, and signing are all handled in UserOperations
 *
 * https://github.com/stackup-wallet/userop.js/blob/1d9d0e034691cd384e194c9e8b3165680a334180/src/preset/builder/simpleAccount.ts
 * We are on userop.js v0.3.7 - upgrading to v0.4.x is a breaking change - requires Ethers v6 or viem signer. The signer is coming from Privy. Privy signer is used to sign in to River, and expects v5 signer.
 */
export class TownsSimpleAccount extends UserOperationBuilder {
    private signer: EOASigner
    public provider: BundlerJsonRpcProvider
    public bundlerUrl: string | undefined
    public entryPoint: EntryPoint
    public factory: SimpleAccountFactory
    private initCode: string
    private nonceKey: number
    proxy: SimpleAccountImpl

    private constructor(signer: EOASigner, rpcUrl: string, opts?: IPresetBuilderOpts) {
        super()
        this.signer = signer
        this.provider = new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(opts?.overrideBundlerRpc)
        this.bundlerUrl = opts?.overrideBundlerRpc
        this.entryPoint = EntryPoint__factory.connect(
            opts?.entryPoint || ERC4337.EntryPoint,
            this.provider,
        )
        this.factory = SimpleAccountFactory__factory.connect(
            opts?.factory || ERC4337.SimpleAccount.Factory,
            this.provider,
        )
        this.initCode = '0x'
        this.nonceKey = opts?.nonceKey || 0
        this.proxy = SimpleAccount__factory.connect(constants.AddressZero, this.provider)
    }

    private resolveAccount: UserOperationMiddlewareFn = async (ctx) => {
        const [nonce, code] = await Promise.all([
            this.entryPoint.getNonce(ctx.op.sender, this.nonceKey),
            this.provider.getCode(ctx.op.sender),
        ])
        ctx.op.nonce = nonce
        ctx.op.initCode = code === '0x' ? this.initCode : '0x'
    }

    public static async init(
        signer: EOASigner,
        rpcUrl: string,
        opts?: IPresetBuilderOpts,
    ): Promise<TownsSimpleAccount> {
        const instance = new TownsSimpleAccount(signer, rpcUrl, opts)
        const signerAddress = await signer.getAddress()
        const aaData = await getInitData({
            factoryAddress: instance.factory.address,
            signerAddress,
            rpcUrl,
        })
        instance.initCode = aaData.initCode
        instance.proxy = SimpleAccount__factory.connect(aaData.addr, instance.provider)

        const defaultSignature = await getSignature()

        const base = instance
            .useDefaults({
                sender: instance.proxy.address,
                signature: defaultSignature,
            })
            .useMiddleware(instance.resolveAccount)

        return base
    }

    public getSenderAddress() {
        return this.proxy.address
    }

    execute(to: string, value: BigNumberish, data: BytesLike) {
        return this.setCallData(
            this.proxy.interface.encodeFunctionData('execute', [to, value, data]),
        )
    }

    executeBatch(to: Array<string>, data: Array<BytesLike>) {
        return this.setCallData(this.proxy.interface.encodeFunctionData('executeBatch', [to, data]))
    }

    decodeExecute(data: BytesLike) {
        return this.proxy.interface.decodeFunctionData('execute', data)
    }
}
