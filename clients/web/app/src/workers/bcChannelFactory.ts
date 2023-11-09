const channelNames = {
    PRIVY_FAILURE: 'PRIVY_FAILURE',
} as const

export type MessageTypes = {
    PRIVY_FAILURE: {
        type: 'PRIVY_LATENCY' | 'PRIVY_ERROR'
    }
}

export class TypedBroadcastChannel<MessageType> extends BroadcastChannel {
    public postMessage(message: MessageType): void {
        return super.postMessage(message)
    }
}

export const bcChannelFactory = <C extends keyof MessageTypes>(channel: C) => {
    return new TypedBroadcastChannel<MessageTypes[C]>(channelNames[channel])
}
