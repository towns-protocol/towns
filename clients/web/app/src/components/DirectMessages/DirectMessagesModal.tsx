import React from 'react'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Icon } from '@ui'
import { DirectMessages } from './DirectMessages'

type Props = {
    onHide: () => void
}
export const DirectMessagesModal = (props: Props) => {
    return (
        <ModalContainer
            touchTitle="Direct Messages"
            rightBarButton={<Icon type="compose" color="gray2" />}
            onHide={props.onHide}
        >
            <DirectMessages hideNavigation />
        </ModalContainer>
    )
}
