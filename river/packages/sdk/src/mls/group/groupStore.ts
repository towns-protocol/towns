import { Group } from './group'

// Group DTO replaces group with groupId
export type GroupDTO = Omit<Group, 'group'> & { groupId: Uint8Array }

export interface IGroupStore {
    hasGroup(streamId: string): Promise<boolean>
    getGroup(streamId: string): Promise<GroupDTO | undefined>
    setGroup(dto: GroupDTO): Promise<void>
    clearGroup(streamId: string): Promise<void>
}

export class InMemoryGroupStore implements IGroupStore {
    private groups: Map<string, GroupDTO> = new Map()

    public async hasGroup(streamId: string): Promise<boolean> {
        return this.groups.has(streamId)
    }

    public async getGroup(streamId: string): Promise<GroupDTO | undefined> {
        return this.groups.get(streamId)
    }

    public async setGroup(dto: GroupDTO): Promise<void> {
        this.groups.set(dto.streamId, dto)
    }

    public async clearGroup(streamId: string): Promise<void> {
        this.groups.delete(streamId)
    }
}
