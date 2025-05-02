import { Signer, providers } from 'ethers'

export type Connect<I> = (address: string, signerOrProvider: Signer | providers.Provider) => I
export type ConnectReturnType<C> = ReturnType<Connect<C>>
export type ContractType<C extends Connect<unknown>> = ReturnType<ConnectReturnType<C>>
