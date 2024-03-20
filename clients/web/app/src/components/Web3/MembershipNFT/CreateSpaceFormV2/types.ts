import { Address } from 'wagmi'

export enum PanelType {
    gating = 'gating',
    pricing = 'pricing',
    founder = 'founder', // TODO
    all = 'all',
}

export type TransactionDetails = {
    isTransacting: boolean
    townAddress: Address | undefined
}
