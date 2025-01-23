import React, { useState } from 'react'
import { Box } from '@ui'
import { ModalContainer, ModalContainerProps } from '@components/Modals/ModalContainer'

export const AboveAppProgressOverlay = () => {
    return <Box absoluteFill id="above-app-progress-root" pointerEvents="none" />
}

export const AboveAppProgressModalContainer = (props: ModalContainerProps) => {
    const [container] = useState(() => document.getElementById('above-app-progress-root'))

    if (!container) {
        return null
    }

    return (
        <ModalContainer rootLayer={container} {...props}>
            {props.children}
        </ModalContainer>
    )
}
