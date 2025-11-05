import {
    FullyReadMarker,
    UserSettingsPayload_Snapshot_UserBlocks,
    UserSettingsPayload_Snapshot_UserBlocks_Block,
    UserSettingsPayload_Snapshot_UserBlocksSchema,
} from '@towns-protocol/proto'
import { create } from '@bufbuild/protobuf'
import { ObservableRecord } from '../../observable/observableRecord'

export interface UserSettingsStreamModel {
    streamId: string
    fullyReadMarkers: Record<string, Record<string, FullyReadMarker>>
    userBlocks: Record<string, UserSettingsPayload_Snapshot_UserBlocks>
    appAddress?: string
}

const EMPTY_USER_BLOCKS: UserSettingsPayload_Snapshot_UserBlocks = create(
    UserSettingsPayload_Snapshot_UserBlocksSchema,
    {
        blocks: [],
        userId: new Uint8Array(),
    },
)

export class UserSettingsStreamsView extends ObservableRecord<string, UserSettingsStreamModel> {
    constructor() {
        super({
            makeDefault: (userSettingsStreamId: string): UserSettingsStreamModel => ({
                streamId: userSettingsStreamId,
                fullyReadMarkers: {},
                userBlocks: {},
                appAddress: undefined,
            }),
        })
    }

    setFullyReadMarkers(
        userSettingsStreamId: string,
        streamId: string,
        fullyReadMarkers: Record<string, FullyReadMarker>,
    ): void {
        this.set((prev) => ({
            ...prev,
            [userSettingsStreamId]: {
                ...(prev[userSettingsStreamId] ?? this.makeDefault(userSettingsStreamId)),
                fullyReadMarkers: {
                    ...prev[userSettingsStreamId]?.fullyReadMarkers,
                    [streamId]: fullyReadMarkers,
                },
            },
        }))
    }

    setUserBlocks(
        userSettingsStreamId: string,
        userId: string,
        userBlocks: UserSettingsPayload_Snapshot_UserBlocks,
    ): void {
        this.set((prev) => ({
            ...prev,
            [userSettingsStreamId]: {
                ...(prev[userSettingsStreamId] ?? this.makeDefault(userSettingsStreamId)),
                userBlocks: {
                    ...prev[userSettingsStreamId]?.userBlocks,
                    [userId]: userBlocks,
                },
            },
        }))
    }

    updateUserBlock(
        userSettingsStreamId: string,
        userId: string,
        userBlock: UserSettingsPayload_Snapshot_UserBlocks_Block,
    ): void {
        this.set((prev) => ({
            ...prev,
            [userSettingsStreamId]: {
                ...(prev[userSettingsStreamId] ?? this.makeDefault(userSettingsStreamId)),
                userBlocks: {
                    ...prev[userSettingsStreamId]?.userBlocks,
                    [userId]: {
                        ...(prev[userSettingsStreamId]?.userBlocks[userId] ?? EMPTY_USER_BLOCKS),
                        blocks: [
                            ...(prev[userSettingsStreamId]?.userBlocks[userId]?.blocks ?? []),
                            userBlock,
                        ],
                    },
                },
            },
        }))
    }

    setAppAddress(userSettingsStreamId: string, appAddress: string | undefined) {
        this.set((prev) => {
            const prevStream = prev[userSettingsStreamId] ?? this.makeDefault(userSettingsStreamId)
            return {
                ...prev,
                [userSettingsStreamId]: {
                    ...prevStream,
                    appAddress,
                },
            }
        })
    }
}
