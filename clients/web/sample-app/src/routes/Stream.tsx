import React from 'react'
import { useParams } from 'react-router-dom'
import { StreamView } from '@components/StreamView'

export const StreamRoute = () => {
    const { streamId } = useParams()
    if (!streamId) {
        return <>404 Channels route intended to be used with channel slug</>
    }
    return <StreamView streamId={streamId} />
}
