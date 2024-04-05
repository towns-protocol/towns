import React, { useCallback, useContext } from 'react'
import { useSpaceId } from 'use-towns-client'
import { Panel, TouchPanelContext } from '@components/Panel/Panel'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'
import { PanelContext } from '@components/Panel/PanelContext'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useDevice } from 'hooks/useDevice'

export const CreateChannelPanel = () => {
    const spaceId = useSpaceId()

    return (
        <Panel label="Create Channel">{spaceId ? <PanelContent spaceId={spaceId} /> : <></>}</Panel>
    )
}

const PanelContent = (props: { spaceId: string }) => {
    const { closePanel } = usePanelActions()
    const context = useContext(PanelContext)
    const triggerPanelClose = useContext(TouchPanelContext)?.triggerPanelClose
    const { isTouch } = useDevice()
    const onHide = useCallback(() => {
        if (isTouch) {
            triggerPanelClose()
        } else if (context?.stackId) {
            closePanel()
        }
    }, [closePanel, context?.stackId, isTouch, triggerPanelClose])
    return <CreateChannelFormContainer spaceId={props.spaceId} onHide={onHide} />
}
