import React, { useContext } from 'react'
import { createPortal } from 'react-dom'
import { Box, BoxProps, RootLayerContext } from '@ui'

export const ModalContainer = (props: {
    children: React.ReactNode
    onHide: () => void
    minWidth?: BoxProps['minWidth']
    stableTopAlignment?: boolean
}) => {
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
            <Box
                absoluteFill
                justifyContent={props.stableTopAlignment ? undefined : 'center'}
                alignItems="center"
                pointerEvents="none"
                style={
                    props.stableTopAlignment
                        ? {
                              top: '45%',
                              transform: 'translateY(-50%)',
                          }
                        : undefined
                }
            >
                <Box
                    padding
                    border
                    rounded="md"
                    background="level1"
                    minWidth={props.minWidth || '600'}
                    pointerEvents="auto"
                >
                    {props.children}
                </Box>
            </Box>
        </Box>,
        root,
    )
}
