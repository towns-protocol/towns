import { Channel, RoomMember } from 'use-towns-client'
import { TMentionElement } from '@udecode/plate-mention'

export type TMentionEmoji = { name: string; emoji: string }
export type TMentionComboboxTypes =
    | Channel
    | (RoomMember & { isChannelMember: boolean })
    | TMentionEmoji
export type TEmojiMentionElement = TMentionElement & { emoji: TMentionEmoji }
export type TChannelMentionElement = TMentionElement & { channel: Channel }
export const MOCK_EMOJI = '__mock_emoji__'
