import React from 'react'
import { useEvent } from 'react-use-event-hook'
import { useSearchParams } from 'react-router-dom'
import { useSpaceId } from 'use-towns-client'
import { Panel } from '@components/Panel/Panel'
import { IconButton, Stack } from '@ui'
import { CreateChannelFormContainer } from '@components/Web3/CreateChannelForm'

export const CreateChannelPanel = () => {
    const spaceId = useSpaceId()

    const [searchParams, setSearchParams] = useSearchParams()
    const onCloseClick = useEvent(() => {
        searchParams.delete('create-channel')
        setSearchParams(searchParams)
    })

    return (
        <Panel
            label="Create Channel"
            leftBarButton={<IconButton icon="arrowLeft" onClick={onCloseClick} />}
            onClose={onCloseClick}
        >
            <Stack padding>
                {spaceId ? (
                    <CreateChannelFormContainer spaceId={spaceId} onHide={onCloseClick} />
                ) : (
                    <></>
                )}
            </Stack>
        </Panel>
    )
}
