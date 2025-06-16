import {
    FullyReadMarker,
    UserSettingsPayload_Snapshot_UserBlocks,
    UserSettingsPayload_Snapshot_UserBlocks_Block,
} from '@towns-protocol/proto'
import { Observable } from '../../observable/observable'

export interface UserSettingsStreamModel {
    fullyReadMarkers: Record<string, Record<string, FullyReadMarker>>
    userBlocks: Record<string, UserSettingsPayload_Snapshot_UserBlocks>
}

export class UserSettingsStreams extends Observable<Record<string, UserSettingsStreamModel>> {
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
                ...prev[userStreamId],
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
                ...prev[userStreamId],
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
                ...prev[userStreamId],
                userBlocks: {
                    ...(prev[userStreamId]?.userBlocks ?? {}),
                    [userId]: {
                        ...(prev[userStreamId]?.userBlocks[userId] ?? {}),
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
