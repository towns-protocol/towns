import { Chain } from 'wagmi'
import { foundry } from 'wagmi/chains'

export const foundryClone: Chain = structuredClone(foundry)
