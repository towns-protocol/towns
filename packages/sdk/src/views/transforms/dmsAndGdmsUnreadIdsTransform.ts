import { isEqual } from 'lodash-es'
import { UnreadMarkersModel } from '../streams/unreadMarkersTransform'
import { DmAndGdmModel } from './dmsAndGdmsTransform'
import { DmChannelSettingValue, GdmChannelSettingValue } from '@towns-protocol/proto'

interface Input {
    dmGlobal: DmChannelSettingValue | undefined
    gdmGlobal: GdmChannelSettingValue | undefined
    mutedStreamIds: Set<string> | undefined
    myDmsAndGdms: DmAndGdmModel[]
    unreadMarkers: UnreadMarkersModel
}

export function dmsAndGdmsUnreadIdsTransform(
    value: Input,
    _prev: Input,
    prevResult?: Set<string>,
): Set<string> {
    const {
        unreadMarkers,
        myDmsAndGdms,
        mutedStreamIds: mutedChannelIds,
        dmGlobal,
        gdmGlobal,
    } = value
    const unreadIds = myDmsAndGdms
        .filter((dmGdm) => {
            if (dmGdm.isGdm && gdmGlobal === GdmChannelSettingValue.GDM_MESSAGES_NO_AND_MUTE) {
                return false
            }
            if (!dmGdm.isGdm && dmGlobal === DmChannelSettingValue.DM_MESSAGES_NO_AND_MUTE) {
                return false
            }
            return unreadMarkers.markers[dmGdm.id]?.isUnread && !mutedChannelIds?.has(dmGdm.id)
        })
        .map((dmGdm) => dmGdm.id)
    const result = new Set<string>(unreadIds)

    if (prevResult && isEqual(prevResult, result)) {
        return prevResult
    }
    return result
}
