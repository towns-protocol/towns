import React from 'react'
import { createPortal } from 'react-dom'
import { Box, BoxProps, useZLayerContext } from '@ui'
import { useDevice } from 'hooks/useDevice'

export const ModalContainer = (props: {
    children: React.ReactNode
    onHide: () => void
    minWidth?: BoxProps['minWidth']
    stableTopAlignment?: boolean
}) => {
    const root = useZLayerContext().rootLayerRef?.current
    const { isMobile } = useDevice()
    const minWidth: BoxProps['minWidth'] = isMobile ? '100%' : props.minWidth || '600'

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
                pointerEvents="auto"
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
                    minWidth={minWidth}
                    pointerEvents="auto"
                >
                    {props.children}
                </Box>
            </Box>
        </Box>,
        root,
    )
}
