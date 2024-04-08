import React from 'react'
import { useParams } from 'react-router'
import { Panel } from '@components/Panel/Panel'
import { SpacesChannel } from './SpacesChannel'

type Props = {
    channelId?: string
    parentRoute?: string
}

export const SpacesChannelAnimated = (props: Props) => {
    const { channelSlug } = useParams()
    const channelId = props.channelId || channelSlug

    return (
        <Panel padding="none" gap="none" parentRoute="../">
            <SpacesChannel channelId={channelId} />
        </Panel>
    )
}
