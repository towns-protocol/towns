import type { PlainMessage, SlashCommand } from '@towns-protocol/proto'

// To update the slash command list, you can add entries here and run the following command:
// npx towns-bot update-commands src/commands.ts <your-bearer-token>
const commands = [
    {
        name: 'help',
        description: 'Get help with bot commands',
    },
    {
        name: 'time',
        description: 'Get the current time',
    },
] as const satisfies PlainMessage<SlashCommand>[]

export default commands
