// import { NotPromise, packUserOp } from '@account-abstraction/utils'
// import { DefaultGasOverheads, GasOverheads, SimpleAccountAPI } from '@account-abstraction/sdk'
// import { Deferrable, arrayify, hexlify } from 'ethers/lib/utils'
// import { IUserOperation } from 'userop'
// import { BigNumber, BigNumberish, ethers } from 'ethers'
// import { SimpleAccountFactory__factory } from 'userop/dist/typechain'

// // userop.js calls eth_estimateUserOperationGas to estimate
// // 1. the callGasLimit
// // 2. the preVerificationGas
// // 3. the verificationGasLimit
// // Calling eth_estimateUserOperationGas on the eth-infinitism bundler results in failure because of entrypoint.staticCall.simulateValidation
// // Unknown exactly why this occurs but it may relate to debug_traceCall and anvil's implementation of it
// // So instead, for local development, we need to estimate the gas ourselves
// // This code is mainly copied from the @account-abstraction/sdk, which calculates gas without calling eth_estimateUserOperationGas
// export async function estimateGasForLocalBundler(args: {
//     target: string
//     provider: ethers.providers.JsonRpcProvider
//     entryPointAddress: string
//     sender: string
//     callData: string
//     factoryAddress: string
//     signer: ethers.Signer
// }) {
//     const { target, provider, entryPointAddress, sender, callData, factoryAddress, signer } = args

//     const accountApi = new SimpleAccountAPI({
//         provider,
//         entryPointAddress,
//         factoryAddress,
//         owner: signer,
//     })

//     const signedOp = await accountApi.createSignedUserOp({ target, data: callData })

//     const factory = SimpleAccountFactory__factory.connect(factoryAddress, provider)

//     // userop.js SimpleAccount initCode
//     const initCode = ethers.utils.hexConcat([
//         factoryAddress,
//         factory.interface.encodeFunctionData('createAccount', [
//             await signer.getAddress(),
//             ethers.BigNumber.from(0),
//         ]),
//     ])

//     // @account-abstraction/sdk
//     // This seems to be accurate only half the time
//     const getPreVerificationGas = async (userOp: Partial<IUserOperation>): Promise<number> => {
//         const p = await resolveProperties(userOp)
//         return calcPreVerificationGas(p, DefaultGasOverheads)
//     }

//     const callGasLimit = await provider.estimateGas({
//         from: entryPointAddress,
//         to: sender,
//         data: callData,
//     })

//     const verificationGasLimit = BigNumber.from(100000) // simpleaccountApi.getVerificationGasLimit() returns hardcoded 100000
//         .add(await estimateCreationGas(provider, initCode))

//     return {
//         callGasLimit,
//         preVerificationGas: Math.max(
//             await getPreVerificationGas(signedOp as IUserOperation),
//             1_000_000,
//         ), // getPreVerificationGas is often too low, so we set a minimum of 1_000_000, which is probably too high, but this is local development only
//         verificationGasLimit,
//     }
// }

//
// Disabling this code b/c switched to a different bundler and adding @account-abstraction packages cause town contracts to require regeneration, which seems strange, and I want to talk to G about it first
//

// async function resolveProperties<T extends object>(object: Readonly<Deferrable<T>>): Promise<T> {
//     const promises = Object.keys(object).map(async (key) => {
//         const value = object[key as keyof Deferrable<T>]
//         return Promise.resolve(value).then((v) => ({ key: key, value: v }))
//     })

//     const results = await Promise.all(promises)
//     return results.reduce<T>((accum, result) => {
//         accum[result.key as keyof T] = result.value
//         return accum
//     }, {} as T)
// }

// // @account-abstraction/sdk
// // from simpleAccountApi.ts
// const estimateCreationGas = async (
//     provider: ethers.providers.JsonRpcProvider,
//     initCode?: string,
// ): Promise<BigNumberish> => {
//     if (initCode == null || initCode === '0x') return 0
//     const deployerAddress = initCode.substring(0, 42)
//     const deployerCallData = '0x' + initCode.substring(42)
//     return provider.estimateGas({ to: deployerAddress, data: deployerCallData })
// }

// /**
//  * calculate the preVerificationGas of the given UserOperation
//  * preVerificationGas (by definition) is the cost overhead that can't be calculated on-chain.
//  * it is based on parameters that are defined by the Ethereum protocol for external transactions.
//  * @param userOp filled userOp to calculate. The only possible missing fields can be the signature and preVerificationGas itself
//  * @param overheads gas overheads to use, to override the default values
//  */
// export function calcPreVerificationGas(
//     userOp: Partial<NotPromise<IUserOperation>>,
//     overheads?: Partial<GasOverheads>,
// ): number {
//     const ov = { ...DefaultGasOverheads, ...(overheads ?? {}) }
//     const p: NotPromise<Partial<IUserOperation>> = {
//         // dummy values, in case the UserOp is incomplete.
//         preVerificationGas: 21000, // dummy value, just for calldata cost
//         signature: hexlify(Buffer.alloc(ov.sigSize, 1)), // dummy signature
//         ...userOp,
//     }

//     const packed = arrayify(packUserOp(p as NotPromise<IUserOperation>, false))
//     const lengthInWord = (packed.length + 31) / 32
//     const callDataCost = packed
//         .map((x) => (x === 0 ? ov.zeroByte : ov.nonZeroByte))
//         .reduce((sum, x) => sum + x)
//     const ret = Math.round(
//         callDataCost + ov.fixed / ov.bundleSize + ov.perUserOp + ov.perUserOpWord * lengthInWord,
//     )
//     return ret
// }
