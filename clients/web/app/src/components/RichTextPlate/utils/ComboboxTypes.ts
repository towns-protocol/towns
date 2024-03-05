import { Channel, RoomMember } from 'use-zion-client'
import { TMentionElement } from '@udecode/plate-mention'

export type TMentionEmoji = { name: string; emoji: string }
export type TMentionComboboxTypes = Channel | RoomMember | TMentionEmoji
export type TEmojiMentionElement = TMentionElement & { emoji: TMentionEmoji }
