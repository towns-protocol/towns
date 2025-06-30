import {
    Snapshot,
    SpacePayload_ChannelSettingsSchema,
} from '@towns-protocol/proto'
import { isDefaultChannelId, streamIdFromBytes } from '../id'
import { create } from '@bufbuild/protobuf'

export function snapshotMigration0002(snapshot: Snapshot): Snapshot {
    switch (snapshot.content?.case) {
        case 'spaceContent': {
            snapshot.content.value.channels =
                snapshot.content.value.channels.map((c) => {
                    if (c.settings === undefined) {
                        c.settings = create(
                            SpacePayload_ChannelSettingsSchema,
                            {
                                autojoin: false,
                                hideUserJoinLeaveEvents: false,
                            },
                        )
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
