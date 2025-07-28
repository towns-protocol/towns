import { getMutedChannelIds } from '../../notificationsClient'
import { isEqual } from 'lodash-es'
import { NotificationSettingsModel } from '../streams/notificationSettings'

type Input = NotificationSettingsModel

const EMPTY_SET = new Set<string>()

export function mutedStreamIdsTransform(
    value: Input,
    _prev: Input,
    prevResult?: Set<string>,
): Set<string> {
    const mutedChannelIds = getMutedChannelIds(value.settings) ?? EMPTY_SET
    if (prevResult && isEqual(prevResult, mutedChannelIds)) {
        return prevResult
    }
    return mutedChannelIds
}
