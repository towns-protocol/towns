import { Snapshot } from '@river-build/proto'
import { bin_equal } from '@river-build/dlog'

// Generic compactFunc function
function compactFunc<T>(elements: T[], keyFn: (element: T) => Uint8Array): T[] {
    if (elements.length === 0) {
        return elements
    }
    let j = 1
    for (let i = 1; i < elements.length; i++) {
        const key2 = keyFn(elements[i])
        const key1 = keyFn(elements[i - 1])

        if (!bin_equal(key2, key1)) {
            elements[j] = elements[i]
            j++
        }
    }

    return elements.slice(0, j)
}

// / nasty bug with the insert_sorted function, it was inserting an extra element at the end
// / every insert, we need to remove duplicates
export function snapshotMigration0001(snapshot: Snapshot): Snapshot {
    if (snapshot.members) {
        snapshot.members.joined = compactFunc(snapshot.members.joined, (m) => m.userAddress)
    }

    switch (snapshot.content?.case) {
        case 'spaceContent': {
            snapshot.content.value.channels = compactFunc(
                snapshot.content.value.channels,
                (c) => c.channelId,
            )
            break
        }
        case 'userContent': {
            snapshot.content.value.memberships = compactFunc(
                snapshot.content.value.memberships,
                (c) => c.streamId,
            )
            break
        }
        case 'userSettingsContent': {
            snapshot.content.value.fullyReadMarkers = compactFunc(
                snapshot.content.value.fullyReadMarkers,
                (c) => c.streamId,
            )
            break
        }
    }
    return snapshot
}
