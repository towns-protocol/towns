import { getTokenValueData } from './hooks/getTokenValue'
import { EvmTransactionRequest, SolanaTransactionRequest } from './TradingContextProvider'

export type QuoteMetaData = {
    mode: 'buy' | 'sell'
    symbol: string
    value: ReturnType<typeof getTokenValueData>
    valueAt: ReturnType<typeof getTokenValueData>
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
