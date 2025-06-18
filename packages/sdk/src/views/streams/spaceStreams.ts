import { Observable } from '../../observable/observable'

export type ParsedChannelProperties = {
    isDefault: boolean
    updatedAtEventNum: bigint
    isAutojoin: boolean
    hideUserJoinLeaveEvents: boolean
}

export interface SpaceStreamModel {
    channelsMetadata: Record<string, ParsedChannelProperties>
}

// entries in the map should never be undefined, but Records don't differentiate between
// undefined and missing keys, so we need to use a Record with undefined values
export class SpaceStreamsView extends Observable<Record<string, SpaceStreamModel | undefined>> {
    constructor() {
        super({})
    }

    delete(spaceId: string, channelId: string) {
        return this.set((prev) => {
            if (prev[spaceId]?.channelsMetadata[channelId] === undefined) {
                return prev
            }
            const channelsMetadata = { ...prev[spaceId].channelsMetadata }
            delete channelsMetadata[channelId]
            return {
                ...prev,
                [spaceId]: {
                    ...prev[spaceId],
                    channelsMetadata,
                },
            }
        })
    }

    updateChannelMetadata(
        spaceId: string,
        channelId: string,
        properties: Partial<ParsedChannelProperties>,
    ) {
        this.set((prev) => {
            const next = { ...prev }
            const space = next[spaceId] ?? { channelsMetadata: {} }
            const channel = space.channelsMetadata[channelId] ?? {
                isDefault: false,
                updatedAtEventNum: BigInt(0),
                isAutojoin: false,
                hideUserJoinLeaveEvents: false,
            }
            next[spaceId] = {
                ...space,
                channelsMetadata: {
                    ...space.channelsMetadata,
                    [channelId]: { ...channel, ...properties },
                },
            }
            return next
        })
    }
}
