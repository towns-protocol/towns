import { createContext } from 'react'
import { TickerAttachment } from '@towns-protocol/sdk'

export const TickerThreadContext = createContext<TickerAttachment | undefined>(undefined)
