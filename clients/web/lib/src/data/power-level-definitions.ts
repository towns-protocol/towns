/*
    Our app uses smart contracts isEntitled functions to check if user has
    permission to perform an action. We do not use dendrite's power levels.
    Drop all power levels to 0 to avoid conflicts with dendrite's power level
    enforcement.
*/
export const DefaultChannelPowerLevels = {
    ban: 0,
    events: {
        'm.reaction': 0,
        'm.room.avatar': 0,
        'm.room.canonical_alias': 0,
        'm.room.history_visibility': 0,
        'm.room.name': 0,
        'm.room.pinned_events': 0,
        'm.room.power_levels': 0,
        'm.room.server_acl': 0,
        'm.room.tombstone': 0,
        'm.room.topic': 0,
    },
    events_default: 0,
    invite: 0,
    kick: 0,
    notifications: {
        room: 0,
    },
    redact: 0,
    state_default: 0,
    users_default: 0,
}

export const DefaultSpacePowerLevels = {
    ...DefaultChannelPowerLevels,
    events: {
        ...DefaultChannelPowerLevels.events,
        'm.space.child': 0,
    },
}

export const powerLevelDefinitions = [
    {
        key: 'users_default',
        name: 'Users Default',
        description: 'The default power level for every user in the room.',
        default: 0,
    },
    {
        key: 'events_default',
        name: 'Events Default',
        description:
            'The default level required to send message events. Can be overridden by the events key. Defaults to 0 if unspecified.',
        default: 0,
    },
    {
        key: 'state_default',
        name: 'State Default',
        description:
            'The default level required to send state events. Can be overridden by the events key.',
        default: 50,
    },
    {
        key: 'ban',
        name: 'Ban',
        description: 'The level required to ban a user.',
        default: 50,
    },
    {
        key: 'invite',
        name: 'Invite',
        description: 'The level required to invite a user.',
        default: 50,
    },
    {
        key: 'kick',
        name: 'Kick',
        description: 'The level required to kick a user.',
        default: 50,
    },
    {
        key: 'room',
        name: 'Room Nofitications',
        parent: 'notifications',
        description: 'The level required to trigger an @room notification.',
        default: 50,
    },
    {
        key: 'redact',
        name: 'Redact',
        description: 'The level required to redact an event sent by another user.',
        default: 50,
    },
    {
        key: 'm.reaction',
        parent: 'events',
        name: 'Send reactions',
        description: 'Set minimum power level to send reactions in room.',
        default: 0,
    },
    {
        key: 'm.room.avatar',
        parent: 'events',
        name: 'Change avatar',
        description: 'Set minimum power level to change room/space avatar.',
        default: 50,
    },
    {
        key: 'm.room.canonical_alias',
        parent: 'events',
        name: 'Change canonical alias',
        description: 'Set minimum power level to publish and set main address.',
        default: 50,
    },
    {
        key: 'm.room.encryption',
        parent: 'events',
        name: 'Enable room encryption',
        description: 'Set minimum power level to enable room encryption.',
        default: 50,
    },
    {
        key: 'm.room.history_visibility',
        parent: 'events',
        name: 'Change history visibility',
        description: 'Set minimum power level to change room messages history visibility.',
        default: 50,
    },
    {
        key: 'm.room.name',
        parent: 'events',
        name: 'Change room name',
        description: 'Set minimum power level to change room/space name.',
        default: 50,
    },
    {
        key: 'm.room.pinned_events',
        parent: 'events',
        name: 'Pin messages to room',
        description: 'Set minimum power level to pin messages in room.',
        default: 50,
    },
    {
        key: 'm.room.power_levels',
        parent: 'events',
        name: 'Change room power levels',
        description: 'Set minimum power level to change permissions.',
        default: 50,
    },
    {
        key: 'm.room.server_acl',
        parent: 'events',
        name: 'Change server ACLs',
        description: 'Set minimum power level to change server ACLs.',
        default: 50,
    },
    {
        key: 'm.room.tombstone',
        parent: 'events',
        name: 'Upgrade room (tombstone)',
        description: 'Set minimum power level to upgrade room.',
        default: 50,
    },
    {
        key: 'm.room.topic',
        parent: 'events',
        name: 'Change room topic',
        description: 'Set minimum power level to change room/space topic.',
        default: 50,
    },
    {
        key: 'm.space.child',
        parent: 'events',
        name: 'Add channels to a space',
        description: 'Set minimum power level to manage rooms in space.',
        default: 50,
    },
]
