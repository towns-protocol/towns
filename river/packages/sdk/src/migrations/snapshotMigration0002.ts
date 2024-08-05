import { Snapshot, SpacePayload_ChannelSettings } from '@river-build/proto'
import { isDefaultChannelId, streamIdFromBytes } from '../id'

export function snapshotMigration0002(snapshot: Snapshot): Snapshot {
    switch (snapshot.content?.case) {
        case 'spaceContent': {
            snapshot.content.value.channels = snapshot.content.value.channels.map((c) => {
                if (c.settings === undefined) {
                    c.settings = new SpacePayload_ChannelSettings({
                        autojoin: false,
                        hideUserJoinLeaveEvents: false,
                    })
                }
                if (isDefaultChannelId(streamIdFromBytes(c.channelId))) {
                    c.settings.autojoin = true
                }
                return c
            })
        }
    }
    return snapshot
}
