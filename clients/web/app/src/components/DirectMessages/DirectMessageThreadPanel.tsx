import React from 'react'
import { useEvent } from 'react-use-event-hook'
import { useNavigate } from 'react-router'
import { Panel } from '@components/Panel/Panel'
import { DirectMessageThread } from './DirectMessageThread'

export const DirectMessageThreadPanel = () => {
    const navigate = useNavigate()
    const onClose = useEvent(() => {
        navigate('..')
    })

    return (
        <Panel label="Message Thread" onClose={onClose}>
            <DirectMessageThread />
        </Panel>
    )
}
