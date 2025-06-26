import { UserSettingsPayload_Snapshot_UserBlocks } from '@towns-protocol/proto'
import { isEqual } from 'lodash-es'

type Input = Record<string, UserSettingsPayload_Snapshot_UserBlocks>

export function blockedUserIdsTransform(
    value: Input,
    _prev: Input,
    prevState?: Set<string>,
): Set<string> {
    const blockedUserIds = Object.entries(value)
        .filter(([_, userBlocks]) => userBlocks.blocks.at(-1)?.isBlocked)
        .map(([userId, _]) => userId)

    const state = new Set(blockedUserIds)
    if (prevState && isEqual(prevState, state)) {
        return prevState
    }

    return state
}
