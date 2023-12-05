import Dexie, { Table } from 'dexie'

export class PersistenceStore extends Dexie {
    cleartexts!: Table<{ cleartext: string; eventId: string }>

    constructor(databaseName: string) {
        super(databaseName)
        this.version(1).stores({
            cleartexts: 'eventId',
        })
    }

    async saveCleartext(eventId: string, cleartext: string) {
        await this.cleartexts.put({ eventId, cleartext })
    }

    async getCleartext(eventId: string) {
        const record = await this.cleartexts.get(eventId)
        return record?.cleartext
    }
}
