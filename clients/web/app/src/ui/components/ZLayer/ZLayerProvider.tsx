import React, { useRef } from 'react'
// import { atoms } from 'ui/styles/atoms.css'
import { atoms } from 'ui/styles/atoms.css'
import { ZLayerContext } from './ZLayer'

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
                        overscrollBehavior: 'none',
                    } as React.CSSProperties
                }
            />
        </ZLayerContext.Provider>
    )
}
