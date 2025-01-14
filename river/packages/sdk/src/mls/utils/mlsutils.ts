import { check } from '@river-build/dlog'
import { IStreamStateView } from '../../streamStateView'

export function extractMlsExternalGroup(streamView: IStreamStateView): {
    externalGroupSnapshot: Uint8Array
    groupInfoMessage: Uint8Array
    commits: { commit: Uint8Array; groupInfoMessage: Uint8Array }[]
} {
    const indexOfLastSnapshot = streamView.timeline.findLastIndex((event) => {
        const payload = event.remoteEvent?.event.payload
        if (payload?.case !== 'miniblockHeader') {
            return false
        }
        return payload.value.snapshot !== undefined
    })

    const payload = streamView.timeline[indexOfLastSnapshot].remoteEvent?.event.payload
    check(payload?.case === 'miniblockHeader', 'no snapshot found')
    const snapshot = payload.value.snapshot
    check(snapshot !== undefined, 'no snapshot found')
    const externalGroupSnapshot = snapshot.members?.mls?.externalGroupSnapshot
    check(externalGroupSnapshot !== undefined, 'no externalGroupSnapshot found')
    const groupInfoMessage = snapshot.members?.mls?.groupInfoMessage
    check(groupInfoMessage !== undefined, 'no groupInfoMessage found')
    const commits: { commit: Uint8Array; groupInfoMessage: Uint8Array }[] = []
    for (let i = indexOfLastSnapshot; i < streamView.timeline.length; i++) {
        const event = streamView.timeline[i]
        const payload = event.remoteEvent?.event.payload
        if (payload?.case !== 'memberPayload') {
            continue
        }
        if (payload?.value?.content.case !== 'mls') {
            continue
        }

        const mlsPayload = payload.value.content.value
        switch (mlsPayload.content.case) {
            case 'externalJoin':
            case 'welcomeMessage':
                commits.push({
                    commit: mlsPayload.content.value.commit,
                    groupInfoMessage: mlsPayload.content.value.groupInfoMessage,
                })
                break

            case undefined:
                break
            default:
                break
        }
    }
    return { externalGroupSnapshot, groupInfoMessage, commits: commits }
}
