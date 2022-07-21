import { IContent, MatrixClient } from "matrix-js-sdk";

export enum RoomVisibility {
  Private = "private",
  Public = "public",
}

export enum Membership {
  Join = "join",
  Invite = "invite",
  Leave = "leave",
}

export interface ZionContext {
  matrixClient?: MatrixClient;
  defaultSpaceId?: RoomIdentifier;
  defaultSpaceName?: string;
  defaultSpaceAvatarSrc?: string;
}

export interface RoomIdentifier {
  slug: string;
  matrixRoomId: string;
}

export type InviteData = {
  id: RoomIdentifier;
  name: string;
  avatarSrc: string;
  bannerSrc?: string;
  isSpaceRoom: boolean;
  spaceParentId?: RoomIdentifier;
};

export type Channel = {
  id: RoomIdentifier;
  label: string;
  private?: boolean;
  highlight?: boolean;
};

export type ChannelGroup = {
  label: string;
  channels: Channel[];
};

/**
 * representation of a space for the UI
 */
export type SpaceData = {
  id: RoomIdentifier;
  name: string;
  avatarSrc: string;
  bannerSrc?: string;
  active?: boolean;
  // should belong to usersettings
  pinned?: boolean;
  channelGroups: ChannelGroup[];
  membership: string;
};

export interface Space {
  id: RoomIdentifier;
  name: string;
  membership: string;
  members: Members;
  inviter?: string;
  children: SpaceChild[];
}

export interface Spaces {
  [slug: string]: Space;
}

export interface SpaceChild {
  id: RoomIdentifier;
  name?: string;
  avatarUrl?: string;
  topic?: string;
  canonicalAlias?: string;
  aliases?: string[];
  worldReadable: boolean;
  guestCanJoin: boolean;
  numjoinedMembers: number;
}

export interface Room {
  id: RoomIdentifier;
  name: string;
  membership: string;
  members: Members;
  inviter?: string;
  isSpaceRoom: boolean;
}

export interface Rooms {
  [slug: string]: Room;
}

export interface Member {
  userId: string;
  name: string;
  membership: Membership;
}

export interface Members {
  [userId: string]: Member;
}

export interface RoomMessage {
  eventId: string;
  sender: string;
  body: string;
  msgType: string;
  originServerTs: number;
  content?: IContent;
}

export interface RoomsMessages {
  [slug: string]: RoomMessage[];
}

export interface CreateSpaceInfo {
  spaceName: string;
  visibility: RoomVisibility;
}

export interface CreateRoomInfo {
  roomName: string;
  visibility: RoomVisibility;
  isDirectMessage?: boolean;
  parentSpaceId?: RoomIdentifier;
}

/// use to send different types of messages, e.g. text, emoji, image, etc.
/// currently unsupported: Emote = "m.emote", Notice = "m.notice", Image = "m.image", File = "m.file", Audio = "m.audio", Location = "m.location", Video = "m.video",
export enum MessageType {
  Text = "m.text",
  WenMoon = "m.wenmoon",
}

export interface SendMessageOptions {
  threadId?: string;
  messageType?: MessageType;
}

export interface PowerLevels {
  userPowers: { [userId: string]: number };
  levels: PowerLevel[];
}

export interface PowerLevel {
  value: number;
  definition: PowerLevelDefinition;
}

export interface PowerLevelDefinition {
  key: string;
  name: string;
  description: string;
  default: number;
  parent?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRoom(room: any): room is Room {
  const r = room as Room;
  return (
    r.id != undefined &&
    r.id.matrixRoomId !== undefined &&
    r.name !== undefined &&
    r.members !== undefined &&
    r.membership !== undefined
  );
}

export function makeRoomIdentifier(roomId: string): RoomIdentifier {
  return {
    slug: encodeURIComponent(roomId.replace(".com", "-c0m-")), // TODO - this should be using matrixClient.getRoomIdForAlias, but didn't want to add another async loop here just yet
    matrixRoomId: roomId,
  };
}

export function makeRoomIdentifierFromSlug(slug: string): RoomIdentifier {
  return {
    slug: encodeURIComponent(decodeURIComponent(slug)), // TODO - this should be using matrixClient.getRoomIdForAlias, but didn't want to add another async loop here just yet
    matrixRoomId: decodeURIComponent(slug).replace("-c0m-", ".com"),
  };
}
