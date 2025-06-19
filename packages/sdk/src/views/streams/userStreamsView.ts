import {
    BlockchainTransaction_TokenTransfer,
    UserPayload_UserMembership,
} from '@towns-protocol/proto'
import { ObservableRecord } from '../../observable/observableRecord'

export interface UserStreamModel {
    streamId: string
    streamMemberships: Record<string, UserPayload_UserMembership | undefined>
    tipsSent: Record<string, bigint | undefined>
    tipsReceived: Record<string, bigint | undefined>
    tipsSentCount: Record<string, bigint | undefined>
    tipsReceivedCount: Record<string, bigint | undefined>
    tokenTransfers: BlockchainTransaction_TokenTransfer[]
}

export class UserStreamsView extends ObservableRecord<string, UserStreamModel> {
    constructor() {
        super({
            makeDefault: (userStreamId: string): UserStreamModel => ({
                streamId: userStreamId,
                streamMemberships: {},
                tipsSent: {},
                tipsReceived: {},
                tipsSentCount: {},
                tipsReceivedCount: {},
                tokenTransfers: [],
            }),
        })
    }

    setMembership(userStreamId: string, streamId: string, membership: UserPayload_UserMembership) {
        this.set((prev) => {
            const prevStream = prev[userStreamId] ?? this.makeDefault(userStreamId)
            return {
                ...prev,
                [userStreamId]: {
                    ...prevStream,
                    streamMemberships: {
                        ...prevStream.streamMemberships,
                        [streamId]: membership,
                    },
                },
            }
        })
    }

    setTips(
        userStreamId: string,
        tips: {
            tipsSent: Record<string, bigint>
            tipsReceived: Record<string, bigint>
            tipsSentCount: Record<string, bigint>
            tipsReceivedCount: Record<string, bigint>
        },
    ) {
        this.set((prev) => {
            const prevStream = prev[userStreamId] ?? this.makeDefault(userStreamId)
            return {
                ...prev,
                [userStreamId]: {
                    ...prevStream,
                    ...tips,
                },
            }
        })
    }

    prependTokenTransfer(userStreamId: string, tokenTransfer: BlockchainTransaction_TokenTransfer) {
        this.set((prev) => {
            const prevStream = prev[userStreamId] ?? this.makeDefault(userStreamId)
            return {
                ...prev,
                [userStreamId]: {
                    ...prevStream,
                    tokenTransfers: [tokenTransfer, ...prevStream.tokenTransfers],
                },
            }
        })
    }

    appendTokenTransfer(userStreamId: string, tokenTransfer: BlockchainTransaction_TokenTransfer) {
        this.set((prev) => {
            const prevStream = prev[userStreamId] ?? this.makeDefault(userStreamId)
            return {
                ...prev,
                [userStreamId]: {
                    ...prevStream,
                    tokenTransfers: [...prevStream.tokenTransfers, tokenTransfer],
                },
            }
        })
    }

    appendTipSent(userStreamId: string, currency: string, amount: bigint) {
        this.set((prev) => {
            const prevStream = prev[userStreamId] ?? this.makeDefault(userStreamId)
            return {
                ...prev,
                [userStreamId]: {
                    ...prevStream,
                    tipsSent: {
                        ...prevStream.tipsSent,
                        [currency]: (prevStream.tipsSent[currency] ?? 0n) + amount,
                    },
                    tipsSentCount: {
                        ...prevStream.tipsSentCount,
                        [currency]: (prevStream.tipsSentCount[currency] ?? 0n) + 1n,
                    },
                },
            }
        })
    }

    appendTipReceived(userStreamId: string, currency: string, amount: bigint) {
        this.set((prev) => {
            const prevStream = prev[userStreamId] ?? this.makeDefault(userStreamId)
            return {
                ...prev,
                [userStreamId]: {
                    ...prevStream,
                    tipsReceived: {
                        ...prevStream.tipsReceived,
                        [currency]: (prevStream.tipsReceived[currency] ?? 0n) + amount,
                    },
                    tipsReceivedCount: {
                        ...prevStream.tipsReceivedCount,
                        [currency]: (prevStream.tipsReceivedCount[currency] ?? 0n) + 1n,
                    },
                },
            }
        })
    }
}
