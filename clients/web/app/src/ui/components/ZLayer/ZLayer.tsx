import React, { createContext } from 'react'

export const ZLayerContext = createContext<
    | {
          rootLayerRef?: React.RefObject<HTMLElement | null>
      }
    | undefined
>(undefined)

export const useZLayerContext = () => {
    const context = React.useContext(ZLayerContext)
    if (!context) {
        throw new Error(
            'ZLayerContext.rootLayerRef is undefined, please wrap the app in a ZLayerProvider ',
        )
    }
    return context
}
