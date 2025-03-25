import { getTokenValueData } from './hooks/getTokenValue'
import { EvmTransactionRequest, SolanaTransactionRequest } from './TradingContextProvider'

export type QuoteMetaData = {
    mode: 'buy' | 'sell'
    symbol: string
    value: ReturnType<typeof getTokenValueData>
    valueAt: ReturnType<typeof getTokenValueData>
    analytics: {
        tokenName: string
        tokenNetwork: 'Solana' | 'ETH'
        amount: string
        amountUSD: string
    }
}

export type QuoteStatus = (
    | { status: 'loading' | 'error' | 'idle' }
    | {
          status: 'ready'
          data: {
              request: EvmTransactionRequest | SolanaTransactionRequest
              metaData: QuoteMetaData
          }
      }
) & { mode: 'buy' | 'sell' }
