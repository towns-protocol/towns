import type { Channel, Dm, Gdm, PersistedModel, SyncAgent } from '@river-build/sdk'

export const isPersistedModel = <T>(value: T | PersistedModel<T>): value is PersistedModel<T> => {
    if (typeof value !== 'object') {
        return false
    }
    if (value === null) {
        return false
    }
    return 'status' in value && 'data' in value
}

export type RiverRoom =
    | {
          type: 'gdm'
          streamId: string
      }
    | {
          type: 'channel'
          spaceId: string
          channelId: string
      }
    | {
          type: 'dm'
          streamId: string
      }

export const getRoom = (sync: SyncAgent, props: RiverRoom): Gdm | Channel | Dm => {
    if (props.type === 'gdm') {
        return sync.gdms.getGdm(props.streamId)
    } else if (props.type === 'channel') {
        return sync.spaces.getSpace(props.spaceId).getChannel(props.channelId)
    } else if (props.type === 'dm') {
        return sync.dms.getDm(props.streamId)
    }
    throw new Error('Invalid room type')
}
