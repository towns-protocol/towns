import { Address } from 'wagmi'

export enum PanelType {
    gating = 'gating',
    pricing = 'pricing',
    founder = 'founder', // TODO
}

export type PanelContentProps = {
    onClick?: () => void
    panelType?: PanelType
}

export type TransactionDetails = {
    isTransacting: boolean
    townAddress: Address | undefined
}
