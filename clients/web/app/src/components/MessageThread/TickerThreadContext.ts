import { createContext } from 'react'
import { TickerAttachment } from '@river-build/sdk'

export const TickerThreadContext = createContext<TickerAttachment | undefined>(undefined)
