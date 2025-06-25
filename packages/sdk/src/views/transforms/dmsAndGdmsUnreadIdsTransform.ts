import { isEqual } from 'lodash-es'
import { UnreadMarkersModel } from '../streams/unreadMarkersTransform'
import { DmAndGdmModel } from './dmsAndGdmsTransform'

interface Input {
    myDmsAndGdms: DmAndGdmModel[]
    unreadMarkers: UnreadMarkersModel
}

export function dmsAndGdmsUnreadIdsTransform(
    value: Input,
    _prev: Input,
    prevResult?: Set<string>,
): Set<string> {
    const { unreadMarkers, myDmsAndGdms } = value
    const unreadIds = myDmsAndGdms
        .filter((dmGdm) => unreadMarkers.markers[dmGdm.id]?.isUnread)
        .map((dmGdm) => dmGdm.id)
    const result = new Set<string>(unreadIds)

    if (prevResult && isEqual(prevResult, result)) {
        return prevResult
    }
    return result
}
