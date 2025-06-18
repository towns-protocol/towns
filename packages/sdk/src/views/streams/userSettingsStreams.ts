import {
    FullyReadMarker,
    UserSettingsPayload_Snapshot_UserBlocks,
    UserSettingsPayload_Snapshot_UserBlocks_Block,
    UserSettingsPayload_Snapshot_UserBlocksSchema,
} from '@towns-protocol/proto'
import { Observable } from '../../observable/observable'
import { create } from '@bufbuild/protobuf'

export interface UserSettingsStreamModel {
    fullyReadMarkers: Record<string, Record<string, FullyReadMarker>>
    userBlocks: Record<string, UserSettingsPayload_Snapshot_UserBlocks>
}

const EMPTY_USER_SETTINGS: UserSettingsStreamModel = {
    fullyReadMarkers: {},
    userBlocks: {},
}
const EMPTY_USER_BLOCKS: UserSettingsPayload_Snapshot_UserBlocks = create(
    UserSettingsPayload_Snapshot_UserBlocksSchema,
    {
        blocks: [],
        userId: new Uint8Array(),
    },
)

// entries in the map should never be undefined, but Records don't differentiate between
// undefined and missing keys, so we need to use a Record with undefined values
export class UserSettingsStreamsView extends Observable<
    Record<string, UserSettingsStreamModel | undefined>
> {
    constructor() {
        super({})
    }

    setFullyReadMarkers(
        userStreamId: string,
        streamId: string,
        fullyReadMarkers: Record<string, FullyReadMarker>,
    ): void {
        this.set((prev) => ({
            ...prev,
            [userStreamId]: {
                ...(prev[userStreamId] ?? EMPTY_USER_SETTINGS),
                fullyReadMarkers: {
                    ...(prev[userStreamId]?.fullyReadMarkers ?? {}),
                    [streamId]: fullyReadMarkers,
                },
            },
        }))
    }

    setUserBlocks(
        userStreamId: string,
        userId: string,
        userBlocks: UserSettingsPayload_Snapshot_UserBlocks,
    ): void {
        this.set((prev) => ({
            ...prev,
            [userStreamId]: {
                ...(prev[userStreamId] ?? EMPTY_USER_SETTINGS),
                userBlocks: {
                    ...(prev[userStreamId]?.userBlocks ?? {}),
                    [userId]: userBlocks,
                },
            },
        }))
    }

    updateUserBlock(
        userStreamId: string,
        userId: string,
        userBlock: UserSettingsPayload_Snapshot_UserBlocks_Block,
    ): void {
        this.set((prev) => ({
            ...prev,
            [userStreamId]: {
                ...(prev[userStreamId] ?? EMPTY_USER_SETTINGS),
                userBlocks: {
                    ...(prev[userStreamId]?.userBlocks ?? {}),
                    [userId]: {
                        ...(prev[userStreamId]?.userBlocks[userId] ?? EMPTY_USER_BLOCKS),
                        blocks: [
                            ...(prev[userStreamId]?.userBlocks[userId]?.blocks ?? []),
                            userBlock,
                        ],
                    },
                },
            },
        }))
    }
}
