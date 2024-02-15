import React, { useState } from 'react'
import { Button, Heading, Paragraph } from '@ui'
import { AllChannelsList } from 'routes/AllChannelsList/AllChannelsList'
import { ModalContainer } from './Modals/ModalContainer'

export const NoJoinedChannelsFallback = () => {
    const [isVisible, setIsVisible] = useState(false)
    const show = () => setIsVisible(true)
    const hide = () => setIsVisible(false)

    return (
        <>
            <Heading level={3} textAlign="center">
                {`You haven't joined any channels.`}
            </Heading>
            <Paragraph textAlign="center" color="gray2">
                {`Browse channels to find one you like.`}
            </Paragraph>
            <Button tone="cta1" onClick={show}>
                Browse channels
            </Button>

            {isVisible && (
                <ModalContainer touchTitle="Browse channels" onHide={hide}>
                    <AllChannelsList onHideBrowseChannels={hide} />
                </ModalContainer>
            )}
        </>
    )
}
