import { Channel, RoomMember } from 'use-towns-client'

/* 10 mock users */
export const roomMembers: RoomMember[] = [
    {
        userId: '1',
        displayName: 'John Doe',
        username: 'john_doe',
    },
    {
        userId: '2',
        displayName: 'Jane Doe',
        username: 'jane_doe',
    },
    {
        userId: '3',
        displayName: 'Alice',
        username: 'alice',
    },
    {
        userId: '4',
        displayName: 'Bob',
        username: 'bob',
    },
    {
        userId: '5',
        displayName: 'Charlie',
        username: 'charlie',
    },
    {
        userId: '6',
        displayName: 'David',
        username: 'david',
    },
    {
        userId: '7',
        displayName: 'Eve',
        username: 'eve',
    },
    {
        userId: '8',
        displayName: 'Frank',
        username: 'frank',
    },
    {
        userId: '9',
        displayName: 'Grace',
        username: 'grace',
    },
    {
        userId: '10',
        displayName: 'Heidi',
        username: 'heidi',
    },
].map((user) => ({
    ...user,
    usernameConfirmed: false,
    usernameEncrypted: false,
    displayNameEncrypted: false,
}))

/* 5 mock channels */
export const channels: Channel[] = [
    {
        id: '1',
        label: 'general',
    },
    {
        id: '2',
        label: 'random',
    },
    {
        id: '3',
        label: 'off-topic',
    },
    {
        id: '4',
        label: 'help',
    },
    {
        id: '5',
        label: 'announcements',
    },
]
