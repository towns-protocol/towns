import { Address } from '@river-build/web3'
import { utils, providers, BigNumber, BigNumberish } from 'ethers'
import { EntryPoint__factory, SimpleAccountFactory__factory } from 'userop/dist/typechain'
import { ERC4337 } from '../../constants'

export type CreateAccountWorkerMessage = {
    factoryAddress: string
    signerAddress: string
    rpcUrl: string
    salt?: BigNumberish
}

export type CreateAccountWorkerReturn = {
    initCode: string
    addr: Address
}

self.onmessage = async (e: MessageEvent<CreateAccountWorkerMessage>) => {
    const { factoryAddress, signerAddress, rpcUrl, salt } = e.data

    let initCode: string
    let addr: Address

    try {
        initCode = utils.hexConcat([
            factoryAddress,
            SimpleAccountFactory__factory.createInterface().encodeFunctionData('createAccount', [
                signerAddress,
                BigNumber.from(salt ?? 0),
            ]),
        ])

        // Simulate the entryPoint call to get the sender address from error
        const entryPoint = EntryPoint__factory.connect(
            ERC4337.EntryPoint,
            new providers.StaticJsonRpcProvider(rpcUrl),
        )

        try {
            await entryPoint.callStatic.getSenderAddress(initCode)
            throw new Error('getSenderAddress: unexpected result')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (typeof error?.errorArgs?.sender === 'string') {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                addr = error.errorArgs.sender
            } else {
                throw error
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        throw new Error(`Worker failed: ${error.message} - Stack: ${error.stack}`)
    }

    const response: CreateAccountWorkerReturn = { initCode, addr }

    self.postMessage(response)
}
