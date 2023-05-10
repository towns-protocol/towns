import React, { createContext, useRef } from 'react'
import { atoms } from 'ui/styles/atoms.css'

const ZLayerContext = createContext<
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

export const ZLayerProvider = (props: { children: React.ReactNode }) => {
    const rootLayerRef = useRef<HTMLDivElement>(null)
    return (
        <ZLayerContext.Provider value={{ rootLayerRef }}>
            {props.children}
            <div
                className={atoms({ zIndex: 'tooltips' })}
                ref={rootLayerRef}
                style={
                    {
                        position: 'fixed',
                        inset: 0,
                        pointerEvents: 'none',
                    } as React.CSSProperties
                }
            />
        </ZLayerContext.Provider>
    )
}
