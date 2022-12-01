import { createContext, useContext } from 'react'
import { Placement } from './CardOpener'

type CardOpenerContextType = {
    placement: Placement
    closeCard: () => void
}

export const CardOpenerContext = createContext<CardOpenerContextType | null>(null)

export const useCardOpenerContext = () => {
    const context = useContext(CardOpenerContext)
    if (!context) {
        throw new Error(
            'useCardOpenerContext neeed to be used within a CardOpenerContext.Provider ',
        )
    }
    return context
}
