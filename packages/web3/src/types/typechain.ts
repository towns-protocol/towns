import { Signer, providers } from 'ethers'

export type Connect<I> = (address: string, signerOrProvider: Signer | providers.Provider) => I
export type ContractType<C extends Connect<unknown>> = C extends Connect<infer R> ? R : never
