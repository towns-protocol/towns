import { createContext } from 'react'

export const SearchContext = createContext<'messages' | 'global'>('global')
