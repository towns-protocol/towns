type ShortcutsType = {
    [key: string]: {
        [key: string]: {
            keys: Readonly<string | string[]>
            description: string
        }
    }
}

export const Shortcuts = {
    General: {
        DisplayShortcutModal: {
            keys: 'Mod+/',
            description: 'Show all shortcuts',
        },
        DisplaySearchModal: {
            keys: ['Mod+K'],
            description: 'Search for Towns, channels, or DMs',
        },
        CreateNewTown: {
            keys: 'Mod+Alt+N',
            description: 'Create a new town',
        },
        DismissDialog: {
            keys: 'Escape',
            description: 'Dismiss dialogs',
        },
        ClearAllUnreads: {
            keys: 'Shift+Escape',
            description: 'Mark all towns as read',
        },
    },
    Navigation: {
        DisplayTownInfo: {
            keys: 'Mod+Shift+I',
            description: 'Display town info',
        },
        NavigateToPreviousTown: {
            keys: 'Mod+Alt+ArrowUp',
            description: 'Navigate to previous town',
        },
        NavigateToNextTown: {
            keys: 'Mod+Alt+ArrowDown',
            description: 'Navigate to next town',
        },
        NavigateToPreviousChannel: {
            keys: 'Alt+ArrowUp',
            description: 'Navigate to previous channel',
        },
        NavigateToNextChannel: {
            keys: 'Alt+ArrowDown',
            description: 'Navigate to next channel',
        },
        DisplayChannelInfo: {
            keys: 'Alt+I',
            description: 'Display channel info',
        },
        DisplayChannelDirectory: {
            keys: 'Shift+Mod+E',
            description: 'Display channel directory',
        },
    },
    ['Direct Messages']: {
        CreateMessage: {
            keys: 'Mod+Shift+K',
            description: 'Create new message',
        },
        DirectReply: {
            keys: 'R',
            description: 'Direct Reply',
        },
    },
    Messages: {
        EditMessage: {
            keys: 'E',
            description: 'Edit message',
        },
        DeleteMessage: {
            keys: 'Backspace',
            description: 'Delete message',
        },
        ReplyInThread: {
            keys: 'R',
            description: 'Reply in Thread',
        },
        ReactToMessage: {
            keys: 'Mod+E',
            description: 'React to message',
        },
        MarkAsUnread: {
            keys: 'U',
            description: 'Mark as Unread',
        },
        CopyLinkToMessage: {
            keys: 'L',
            description: 'Copy link to message',
        },
    },
    Editor: {
        BoldText: {
            keys: 'Mod+B',
            description: 'Bold',
        },
        ItalicText: {
            keys: 'Mod+I',
            description: 'Italic',
        },
        OpenGifPicker: {
            keys: 'Mod+G',
            description: 'Open GIF picker',
        },
        OpenEmojiPicker: {
            keys: 'Mod+E',
            description: 'Open emoji picker',
        },
    },
} as const satisfies ShortcutsType

export const ShortcutActions = {
    ...Shortcuts.General,
    ...Shortcuts.Navigation,
    ...Shortcuts['Direct Messages'],
    ...Shortcuts.Messages,
    ...Shortcuts.Editor,
}

export type ShortcutAction = keyof typeof ShortcutActions
