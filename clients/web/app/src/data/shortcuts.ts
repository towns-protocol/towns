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
            keys: 'Meta+/',
            description: 'Show all shortcuts',
        },
        DisplaySearchModal: {
            keys: ['Meta+K'],
            description: 'Search for Towns, channels, or DMs',
        },
        CreateNewTown: {
            keys: 'Meta+Alt+N',
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
            keys: 'Meta+Shift+I',
            description: 'Display town info',
        },
        NavigateToPreviousTown: {
            keys: 'Meta+Alt+ArrowUp',
            description: 'Navigate to previous town',
        },
        NavigateToNextTown: {
            keys: 'Meta+Alt+ArrowDown',
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
            keys: 'Shift+Meta+E',
            description: 'Display channel directory',
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
        ReplyToMessage: {
            keys: 'R',
            description: 'Reply to message',
        },
        ReactToMessage: {
            keys: '+',
            description: 'React to message',
        },
    },
    Editor: {
        BoldText: {
            keys: 'Meta+B',
            description: 'Bold',
        },
        ItalicText: {
            keys: 'Meta+I',
            description: 'Italic',
        },
        OpenGifPicker: {
            keys: 'Meta+G',
            description: 'Open GIF picker',
        },
        OpenEmojiPicker: {
            keys: 'Meta+E',
            description: 'Open emoji picker',
        },
    },
} as const satisfies ShortcutsType

export const ShortcutActions = {
    ...Shortcuts.General,
    ...Shortcuts.Navigation,
    ...Shortcuts.Messages,
    ...Shortcuts.Editor,
}

export type ShortcutAction = keyof typeof ShortcutActions
