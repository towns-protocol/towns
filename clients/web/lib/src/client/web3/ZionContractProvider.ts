import { ethers } from 'ethers'

export class ZionContractProvider<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private provider?: ethers.providers.Provider
    private signer?: ethers.Signer
    private address: string
    private contractInterface: ethers.ContractInterface

    constructor(
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
        address: string,
        contractInterface: ethers.ContractInterface,
    ) {
        this.provider = provider
        this.signer = signer
        this.address = address
        this.contractInterface = contractInterface
    }

    /// get contract without signature, for reading from the blockchain
    get unsigned(): T {
        if (!this.provider) {
            throw new Error('No provider')
        }
        return new ethers.Contract(
            this.address,
            this.contractInterface,
            this.provider,
        ) as unknown as T
    }

    /// get contract with signature, for writing to the blockchain
    get signed() {
        if (!this.signer) {
            throw new Error('No signer')
        }
        return new ethers.Contract(
            this.address,
            this.contractInterface,
            this.signer,
        ) as unknown as T
    }
}
