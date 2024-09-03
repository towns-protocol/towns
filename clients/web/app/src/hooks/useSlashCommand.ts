import { useChannelId } from 'use-towns-client'
import { useMemo } from 'react'
import { isChannelStreamId } from '@river-build/sdk'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

interface Command {
    name: string
    description: string
    execute: (params: string[]) => void
}

export function useSlashCommand(): {
    parseAndExecuteCommand: (input: string) => boolean
} {
    const channelId = useChannelId()
    const { openPanel } = usePanelActions()

    const commands: Command[] = useMemo(() => {
        return [
            {
                name: 'mint-bot',
                description: 'Mint a bot',
                execute: (params: string[]) => {
                    if (!isChannelStreamId(channelId)) {
                        console.error('To mint a bot write the command in a channel')
                        return
                    }
                    openPanel(CHANNEL_INFO_PARAMS.MINT_BOT)
                },
            },
            {
                name: 'bearer-token',
                description: 'Get your bearer token',
                execute: async (_params: string[]) => openPanel(CHANNEL_INFO_PARAMS.BEARER_TOKEN),
            },
        ]
    }, [channelId, openPanel])

    function parseAndExecuteCommand(input: string): boolean {
        if (!input.startsWith('/')) {
            return false
        }

        const [commandName, ...params] = input.slice(1).split(' ')
        const command = commands.find((cmd) => cmd.name === commandName)

        if (!command) {
            console.log('Slash command not found')
            return false
        }

        command.execute(params)
        return true
    }

    return {
        parseAndExecuteCommand,
    }
}
