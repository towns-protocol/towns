import React, { createContext, forwardRef, useContext } from 'react'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { MotionBox } from '@ui'
import { MotionBoxProps } from 'ui/components/Motion/MotionComponents'
import { zLayerVar } from 'ui/styles/vars.css'

export const ZLayerContext = createContext<number | undefined>(undefined)

export const ZLayerBox = forwardRef<HTMLDivElement, MotionBoxProps>(
    ({ children, ...props }, ref) => {
        const parentZ = useContext(ZLayerContext) ?? 0
        return (
            <ZLayerContext.Provider value={parentZ + 1}>
                {/* using motion box for panels, may refactor */}
                <MotionBox
                    {...props}
                    style={assignInlineVars({
                        [zLayerVar]: `${parentZ}`,
                    })}
                    ref={ref}
                    zIndex="layer"
                >
                    {children}
                </MotionBox>
            </ZLayerContext.Provider>
        )
    },
)
