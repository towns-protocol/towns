/// An implementation of group state storage from mls-rs-wasm

import { EpochRecord, IGroupStateStorage } from '@river-build/mls-rs-wasm'
import Dexie from 'dexie'
import { bin_toString } from '@river-build/dlog'

/// GroupStateId is a branded string to avoid accidental use of an ordinary
/// string as a group state id. Brand exists only during compile-time and
// does not occur any run-time cost.
type GroupStateId = string & { __brand: 'GroupStateId' }

/// Convert uint8Array to Base64 string
function uint8ArrayToBase64(arr: Uint8Array): string {
    // Convert Uint8Array to a raw binary string
    const binaryString = Array.from(arr, (byte) => String.fromCharCode(byte)).join('')
    // Encode the binary string as Base64
    return btoa(binaryString)
}

/// Convert uint8Array to GroupStateId
function groupStateId(groupId: Uint8Array): GroupStateId {
    const base64GroupId = uint8ArrayToBase64(groupId)
    return base64GroupId as GroupStateId
}

/// Basic in-memory group state storage
export class InMemoryGroupStateStorage implements IGroupStateStorage {
    groupStates: Map<GroupStateId, Uint8Array> = new Map()
    epochStorage: Map<GroupStateId, Map<bigint, Uint8Array>> = new Map()
    maxEpochRetention: bigint = 3n

    state(groupId: Uint8Array): Promise<Uint8Array | undefined> {
        return Promise.resolve(this.groupStates.get(groupStateId(groupId)))
    }

    epoch(groupId: Uint8Array, epochId: bigint): Promise<Uint8Array | undefined> {
        const epoch = this.epochStorage.get(groupStateId(groupId))
        if (epoch) {
            return Promise.resolve(epoch.get(epochId))
        }
        return Promise.resolve(undefined)
    }

    private getOrCreateEpoch(groupId: GroupStateId): Map<bigint, Uint8Array> {
        let epoch = this.epochStorage.get(groupId)
        if (!epoch) {
            epoch = new Map()
            this.epochStorage.set(groupId, epoch)
        }
        return epoch
    }

    write(
        state_id: Uint8Array,
        state_data: Uint8Array,
        epochInserts: EpochRecord[],
        epochUpdates: EpochRecord[],
    ): Promise<void> {
        const groupId = groupStateId(state_id)
        this.groupStates.set(groupId, state_data)
        const epoch = this.getOrCreateEpoch(groupId)

        let maxEpochId = -1n

        // Inserting new epochs
        epochInserts.forEach((e) => {
            maxEpochId = e.id
            epoch.set(e.id, e.data)
        })

        // Updating epochs
        epochUpdates.forEach((e) => {
            epoch.set(e.id, e.data)
        })

        //  Removing epochs below maxEpochRetention
        if (maxEpochId > this.maxEpochRetention) {
            const deleteUnder = maxEpochId - this.maxEpochRetention
            for (const epochId of epoch.keys()) {
                if (epochId <= deleteUnder) {
                    epoch.delete(epochId)
                }
            }
        }

        return Promise.resolve(undefined)
    }

    maxEpochId(groupId: Uint8Array): Promise<bigint | undefined> {
        const epoch = this.epochStorage.get(groupStateId(groupId))
        if (!epoch) {
            return Promise.resolve(undefined)
        }

        const epochIds = Array.from(epoch.keys())
        if (epochIds.length === 0) {
            return Promise.resolve(undefined)
        }

        const maxEpochId = epochIds.reduce((a, b) => (a > b ? a : b))
        return Promise.resolve(maxEpochId)
    }
}

// Dexie-based GroupStateStorage
export class DexieGroupStateStorage extends Dexie implements IGroupStateStorage {
    private groupStates!: Dexie.Table<{ groupId: string; data: Uint8Array; maxEpochId: string }>
    private epochs!: Dexie.Table<{ groupId: string; epochId: string; data: Uint8Array }>
    private maxEpochRetention: bigint = 3n

    constructor(deviceKey: Uint8Array) {
        const databaseName = `mlsStore-${bin_toString(deviceKey)}`
        super(databaseName)
        this.version(1).stores({
            groupStates: 'groupId',
            epochs: '[groupId+epochId]',
        })
    }

    async state(groupId: Uint8Array): Promise<Uint8Array | undefined> {
        const groupId_ = groupStateId(groupId)
        const groupState = await this.groupStates.get(groupId_)
        return groupState?.data
    }

    async epoch(groupId: Uint8Array, epochId: bigint): Promise<Uint8Array | undefined> {
        const groupId_ = groupStateId(groupId)
        const epochId_ = epochId.toString()
        const epoch = await this.epochs.get({ groupId: groupId_, epochId: epochId_ })
        return epoch?.data
    }

    async write(
        stateId: Uint8Array,
        stateData: Uint8Array,
        epochInserts: EpochRecord[],
        epochUpdates: EpochRecord[],
    ): Promise<void> {
        await this.transaction('rw', this.groupStates, this.epochs, async () => {
            const groupId_ = groupStateId(stateId)
            let maxEpochId = -1n
            // process inserts
            const epochInserts_ = epochInserts.map((e) => {
                const epochId_ = e.id.toString()
                maxEpochId = e.id

                return {
                    groupId: groupId_,
                    epochId: epochId_,
                    data: e.data,
                }
            })
            await this.epochs.bulkAdd(epochInserts_)

            const epochUpdates_ = epochUpdates.map((e) => {
                const epochId_ = e.id.toString()

                return {
                    groupId: groupId_,
                    epochId: epochId_,
                    data: e.data,
                }
            })
            await this.epochs.bulkPut(epochUpdates_)

            // Remove epochs below maxEpochRetention
            // Unfortunately has to go over all epochs
            if (maxEpochId > this.maxEpochRetention) {
                const deleteUnder = maxEpochId - this.maxEpochRetention
                await this.epochs
                    .where('groupId')
                    .equals(groupId_)
                    .filter((e) => BigInt(e.epochId) <= deleteUnder)
                    .delete()
            }

            // update group state
            await this.groupStates.put({
                groupId: groupId_,
                data: stateData,
                maxEpochId: maxEpochId.toString(),
            })
        })

        return undefined
    }

    async maxEpochId(groupId: Uint8Array): Promise<bigint | undefined> {
        const groupId_ = groupStateId(groupId)
        const groupState = await this.groupStates.get(groupId_)
        const maxEpochId_ = groupState?.maxEpochId

        if (maxEpochId_ === undefined) {
            return undefined
        }

        const maxEpochId = BigInt(maxEpochId_)

        // guard against incorrect values
        if (maxEpochId < 0n) {
            return undefined
        }

        return maxEpochId
    }
}
