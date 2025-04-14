import { createContext } from 'react'

export const LoadingElementDataContext = createContext<{ loadingAddresses: Set<string> }>({
    loadingAddresses: new Set(),
})
