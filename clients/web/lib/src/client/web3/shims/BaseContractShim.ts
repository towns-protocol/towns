/* eslint-disable no-restricted-imports */

import { ethers } from 'ethers'
import Localhost_EventsAbi from '@harmony/contracts/localhost/abis/Events.abi.json'
import Goerli_EventsAbi from '@harmony/contracts/goerli/abis/Events.abi.json'

interface ContractParams {
    address: string
    abi: ethers.ContractInterface
}
interface Params {
    localhost: ContractParams
    goerli: ContractParams
}

export class BaseContractShim<T_LOCALHOST, T_GOERLI> {
    readonly chainId: number
    get isLocalhost(): boolean {
        return this.chainId === 31337 || this.chainId === 1337
    }
    get isGoerli(): boolean {
        return this.chainId === 5
    }
    private provider?: ethers.providers.Provider
    private signer?: ethers.Signer
    private localhost: ContractParams
    private goerli: ContractParams

    constructor(
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
        params: Params,
    ) {
        this.chainId = chainId
        this.provider = provider
        this.signer = signer
        this.localhost = params.localhost
        this.goerli = params.goerli
    }

    protected get localhost_unsigned(): T_LOCALHOST {
        if (!this.provider) {
            throw new Error('No provider')
        }
        return new ethers.Contract(
            this.localhost.address,
            this.localhost.abi,
            this.provider,
        ) as unknown as T_LOCALHOST
    }

    protected get localhost_events() {
        if (!this.provider) {
            throw new Error('No provider')
        }
        return new ethers.Contract(
            this.localhost.address,
            Localhost_EventsAbi,
            this.provider,
        ) as unknown as T_LOCALHOST
    }

    protected get localhost_signed(): T_LOCALHOST {
        if (!this.signer) {
            throw new Error('No signer')
        }
        return new ethers.Contract(
            this.localhost.address,
            this.localhost.abi,
            this.signer,
        ) as unknown as T_LOCALHOST
    }

    protected get goerli_events() {
        if (!this.provider) {
            throw new Error('No provider')
        }
        return new ethers.Contract(
            this.goerli.address,
            Goerli_EventsAbi,
            this.provider,
        ) as unknown as T_GOERLI
    }

    protected get goerli_unsigned(): T_GOERLI {
        if (!this.provider) {
            throw new Error('No provider')
        }
        return new ethers.Contract(
            this.goerli.address,
            this.goerli.abi,
            this.provider,
        ) as unknown as T_GOERLI
    }

    protected get goerli_signed(): T_GOERLI {
        if (!this.signer) {
            throw new Error('No signer')
        }
        return new ethers.Contract(
            this.goerli.address,
            this.goerli.abi,
            this.signer,
        ) as unknown as T_GOERLI
    }

    get address() {
        if (this.isLocalhost) {
            return this.localhost.address
        } else if (this.isGoerli) {
            return this.goerli.address
        } else {
            throw new Error('Unsupported chainId')
        }
    }

    get abi(): ethers.ContractInterface {
        if (this.isLocalhost) {
            return this.localhost.abi
        } else if (this.isGoerli) {
            return this.goerli.abi
        } else {
            throw new Error(`Unsupported chainId ${this.chainId} for abi`)
        }
    }

    get eventsAbi(): ethers.ContractInterface {
        if (this.isLocalhost) {
            return Localhost_EventsAbi
        } else if (this.isGoerli) {
            return Goerli_EventsAbi
        } else {
            throw new Error(`Unsupported chainId ${this.chainId} for eventsAbi`)
        }
    }

    /// get contract for events
    get events(): T_LOCALHOST | T_GOERLI {
        if (this.isLocalhost) {
            return this.localhost_events
        } else if (this.isGoerli) {
            return this.goerli_events
        } else {
            throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    /// get contract without signature, for reading from the blockchain
    get unsigned(): T_LOCALHOST | T_GOERLI {
        if (this.isLocalhost) {
            return this.localhost_unsigned
        } else if (this.isGoerli) {
            return this.goerli_unsigned
        } else {
            throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    /// get contract with signature, for writing to the blockchain
    get signed(): T_LOCALHOST | T_GOERLI {
        if (this.isLocalhost) {
            return this.localhost_signed
        } else if (this.isGoerli) {
            return this.goerli_signed
        } else {
            throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }
}
