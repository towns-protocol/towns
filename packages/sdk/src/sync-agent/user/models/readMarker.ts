import { FullyReadMarker, FullyReadMarkers_Content } from '@river-build/proto'
import type { RiverConnection } from '../../river-connection/riverConnection'
import type { PlainMessage } from '@bufbuild/protobuf'
import type { IStreamStateView } from '../../../streamStateView'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { LoadPriority, type Identifiable, type Store } from '../../../store/store'

export interface ReadMarkerMap extends Identifiable {
    id: '0'
    markers: {
        [streamId: string]: {
            room: FullyReadMarker
            threads: { [threadParentId: string]: FullyReadMarker }
        }
    }
}

@persistedObservable({ tableName: 'userReadMarker' })
export class UserReadMarker extends PersistedObservable<ReadMarkerMap> {
    constructor(private riverConnection: RiverConnection, protected store: Store) {
        super({ id: '0', markers: {} }, store, LoadPriority.high)
    }

    protected onLoaded(): void {
        //
    }

    onStreamInitialized(stream: IStreamStateView) {
        const map = stream.userSettingsContent.fullyReadMarkers
        for (const [_, markers] of map) {
            this.onFullyReadMarkersUpdated(markers)
        }
    }

    onFullyReadMarkersUpdated(markers: Record<string, PlainMessage<FullyReadMarkers_Content>>) {
        for (const marker of Object.values(markers)) {
            if (!marker.threadParentId) {
                this.setData({
                    markers: {
                        ...this.data.markers,
                        [marker.channelId]: {
                            room: marker,
                            threads: this.data.markers[marker.channelId]?.threads ?? {},
                        },
                    },
                })
            } else {
                this.setData({
                    markers: {
                        ...this.data.markers,
                        [marker.channelId]: {
                            ...this.data.markers[marker.channelId],
                            threads: {
                                ...this.data.markers[marker.channelId].threads,
                                [marker.threadParentId]: marker,
                            },
                        },
                    },
                })
            }
        }
    }

    get(streamId: string) {
        if (!this.data.markers[streamId]) {
            this.setData({
                markers: {
                    ...this.data.markers,
                    [streamId]: {
                        room: this.defaultMarker(streamId),
                        threads: {},
                    },
                },
            })
        }
        return this.data.markers[streamId]
    }

    async markAsRead(
        streamId: string,
        opts?: {
            eventId?: string
            eventNum?: bigint
            beginUnreadWindow: bigint
            endUnreadWindow?: bigint
            threadParentId?: string
        },
    ) {
        return this.riverConnection.callWithStream(streamId, async (client) => {
            if (opts?.threadParentId) {
                const threadMarker = this.get(streamId).threads[opts.threadParentId]
                threadMarker.isUnread = false
                threadMarker.markedReadAtTs = BigInt(Date.now())
                return client.sendFullyReadMarkers(streamId, {
                    [opts.threadParentId]: threadMarker,
                })
            }

            const roomMarker = this.get(streamId).room
            roomMarker.isUnread = false
            roomMarker.markedReadAtTs = BigInt(Date.now())
            return await client.sendFullyReadMarkers(streamId, {
                [streamId]: roomMarker,
            })
        })
    }

    async markAsUnread(streamId: string, threadParentId?: string) {
        return this.riverConnection.callWithStream(streamId, async (client) => {
            if (threadParentId) {
                const threadMarker = this.get(streamId).threads[threadParentId]
                threadMarker.isUnread = true
                threadMarker.markedReadAtTs = 0n
                return client.sendFullyReadMarkers(streamId, {
                    [threadParentId]: threadMarker,
                })
            }

            const roomMarker = this.get(streamId).room
            roomMarker.isUnread = true
            roomMarker.markedReadAtTs = 0n
            return await client.sendFullyReadMarkers(streamId, {
                [streamId]: roomMarker,
            })
        })
    }

    private defaultMarker(streamId: string, threadParentId?: string) {
        return new FullyReadMarkers_Content({
            channelId: streamId,
            threadParentId,
            isUnread: true,
        })
    }
}
