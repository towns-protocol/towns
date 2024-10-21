'use client'

import type { Channel, Gdm } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { useSyncAgent } from './useSyncAgent'

// This hook isnt following the convention, but lets see how it goes
type SendMessageProps =
    | {
          type: 'gdm'
          streamId: string
      }
    | {
          type: 'channel'
          spaceId: string
          channelId: string
      }

export const useSendMessage = (
    props: SendMessageProps,
    config?: (typeof props)['type'] extends 'gdm'
        ? ActionConfig<Gdm['sendMessage']>
        : ActionConfig<Channel['sendMessage']>,
) => {
    const sync = useSyncAgent()
    const namespace = useMemo(() => {
        if (props.type === 'gdm') {
            return sync.gdms.getGdm(props.streamId)
        } else if (props.type === 'channel') {
            return sync.spaces.getSpace(props.spaceId).getChannel(props.channelId)
        }
        return
    }, [props, sync.gdms, sync.spaces])
    const { action: sendMessage, ...rest } = useAction(namespace, 'sendMessage', config)

    return {
        sendMessage,
        ...rest,
    }
}
