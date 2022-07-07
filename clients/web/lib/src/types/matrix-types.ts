import slugify from "slugify";

export enum Visibility {
  Private = "private",
  Public = "public",
}

export enum Membership {
  Join = "join",
  Invite = "invite",
  Leave = "leave",
}

export interface RoomIdentifier {
  slug: string;
  matrixRoomId: string;
}

export interface Space {
  id: RoomIdentifier;
  name: string;
  membership?: string;
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
}

export interface RoomsMessages {
  [slug: string]: RoomMessage[];
}

export interface CreateSpaceInfo {
  spaceName: string;
  visibility: Visibility;
}

export interface CreateRoomInfo {
  roomName: string;
  visibility: Visibility;
  isDirectMessage?: boolean;
  parentSpaceId?: RoomIdentifier;
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
    slug: slugify(roomId, { remove: /[*+~.()'"!:@]/g, strict: true }),
    matrixRoomId: roomId,
  };
}
