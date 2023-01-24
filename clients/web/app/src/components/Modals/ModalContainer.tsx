import React, { useContext } from 'react'
import { createPortal } from 'react-dom'
import { Box, RootLayerContext } from '@ui'

export const ModalContainer = (props: { children: React.ReactNode; onHide: () => void }) => {
    const root = useContext(RootLayerContext).rootLayerRef?.current

    if (!root) {
        console.error(`no root context declared for use of modal`)
        return null
    }

    return createPortal(
        <Box>
            <Box
                absoluteFill
                cursor="crosshair"
                style={{ background: `rgba(0,0,0,0.3)`, backdropFilter: `blur(4px)` }}
                onClick={props.onHide}
            />
            <Box absoluteFill centerContent pointerEvents="none">
                <Box
                    padding
                    border
                    rounded="md"
                    background="level1"
                    minWidth="600"
                    pointerEvents="auto"
                >
                    {props.children}
                </Box>
            </Box>
        </Box>,
        root,
    )
}
