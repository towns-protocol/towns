import React, { createContext, useRef } from 'react'

export const ZLayerContext = createContext<
    | {
          rootLayerRef?: React.RefObject<HTMLElement | null>
      }
    | undefined
>(undefined)

export const useZLayerContext = () => {
    const rootLayerRef = useRef<HTMLDivElement>(null)
    const context = React.useContext(ZLayerContext) ?? { rootLayerRef }

    return context
}
