import React, { useCallback, useState } from 'react'
import { Button, Heading, Paragraph } from '@ui'
import { AllChannelsList } from 'routes/AllChannelsList/AllChannelsList'
import { useAnalytics } from 'hooks/useAnalytics'
import { ModalContainer } from './Modals/ModalContainer'

export const NoJoinedChannelsFallback = () => {
    const [isVisible, setIsVisible] = useState(false)
    const { analytics } = useAnalytics()

    const show = useCallback(() => {
        analytics?.track(
            'clicked browse channels',
            {
                spaceId: 'no space id',
            },
            () => {
                console.log('clicked browse channels (no space id)')
            },
        )
        setIsVisible(true)
    }, [analytics])

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
