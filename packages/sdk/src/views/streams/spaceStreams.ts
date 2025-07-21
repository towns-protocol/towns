import { ObservableRecord } from '../../observable/observableRecord'

export type ParsedChannelProperties = {
    isDefault: boolean
    updatedAtEventNum: bigint
    isAutojoin: boolean
    hideUserJoinLeaveEvents: boolean
}

export interface SpaceStreamModel {
    streamId: string
    channelsMetadata: Record<string, ParsedChannelProperties>
}

// entries in the map should never be undefined, but Records don't differentiate between
// undefined and missing keys, so we need to use a Record with undefined values
export class SpaceStreamsView extends ObservableRecord<string, SpaceStreamModel> {
    constructor() {
        super({
            makeDefault: (spaceStreamId: string): SpaceStreamModel => ({
                streamId: spaceStreamId,
                channelsMetadata: {},
            }),
        })
    }

    delete(spaceStreamId: string, channelId: string): boolean {
        return this.set((prev) => {
            if (prev[spaceStreamId]?.channelsMetadata[channelId] === undefined) {
                return prev
            }
            const channelsMetadata = { ...prev[spaceStreamId].channelsMetadata }
            delete channelsMetadata[channelId]
            return {
                ...prev,
                [spaceStreamId]: {
                    ...prev[spaceStreamId],
                    channelsMetadata,
                },
            }
        })
    }

    updateChannelMetadata(
        spaceStreamId: string,
        channelId: string,
        properties: Partial<ParsedChannelProperties>,
    ) {
        this.set((prev) => {
            const prevSpace = prev[spaceStreamId] ?? this.makeDefault(spaceStreamId)
            const prevChannel = prevSpace.channelsMetadata[channelId] ?? {
                isDefault: false,
                updatedAtEventNum: BigInt(0),
                isAutojoin: false,
                hideUserJoinLeaveEvents: false,
            }
            const retVal = {
                ...prev,
                [spaceStreamId]: {
                    ...prevSpace,
                    channelsMetadata: {
                        ...prevSpace.channelsMetadata,
                        [channelId]: { ...prevChannel, ...properties },
                    },
                },
            }
            return retVal
        })
    }
}
