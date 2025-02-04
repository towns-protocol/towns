import { ConnectedWallet } from '@privy-io/react-auth'

export type FundWalletCallbacks = {
    onTxStart?: ({
        sourceChain,
        sourceAsset,
        sourceAmount,
    }: {
        sourceChain: number | undefined
        sourceAsset: string | undefined
        sourceAmount: string | undefined
    }) => void
    onTxSuccess?: (r: unknown) => Promise<void>
    onTxError?: (error: unknown) => void
    onConnectWallet?: (wallet: ConnectedWallet) => void
}
