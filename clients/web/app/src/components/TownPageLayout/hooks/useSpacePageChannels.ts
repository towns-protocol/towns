import { useEffect, useState } from 'react'
import { useSpaceDapp, useTownsContext } from 'use-towns-client'

type Channel = {
    name: string
    channelNetworkId: string
}

export const useSpacePageChannels = (spaceId: string) => {
    const { baseConfig, baseProvider } = useTownsContext()
    const spaceDapp = useSpaceDapp({ config: baseConfig, provider: baseProvider })
    const [channels, setChannels] = useState<Channel[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!spaceDapp) {
            return
        }

        spaceDapp.getChannels(spaceId).then((channelMetadata) => {
            setChannels(
                channelMetadata
                    .filter((c) => !c.disabled)
                    .map((c) => ({
                        name: c.name,
                        channelNetworkId: c.channelNetworkId,
                    })),
            )
            setIsLoading(false)
        })
    }, [spaceDapp, spaceId])

    return {
        channels,
        isLoading,
        channelCount: channels.length,
    }
}
