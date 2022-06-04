export enum Visibility {
  Private = "private",
  Public = "public",
}

export enum Membership {
  Join = "join",
  Invite = "invite",
  Leave = "leave",
}

export interface Space {
  id: string;
  name: string;
  membership?: string;
  members: Members;
  inviter?: string;
  children: SpaceChild[];
}

export interface SpaceChild {
  roomId: string;
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
  roomId: string;
  name: string;
  membership: string;
  members: Members;
  inviter?: string;
  isSpaceRoom: boolean;
}

export interface Rooms {
  [roomId: string]: Room;
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
  sender: string;
  message: string;
}

export interface RoomsMessages {
  [roomId: string]: RoomMessage[];
}

export interface CreateSpaceInfo {
  spaceName: string;
  visibility: Visibility;
}

export interface CreateRoomInfo {
  roomName: string;
  visibility: Visibility;
  isDirectMessage?: boolean;
  parentSpaceId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRoom(room: any): room is Room {
  const r = room as Room;
  return (
    r.roomId !== undefined &&
    r.name !== undefined &&
    r.members !== undefined &&
    r.membership !== undefined
  );
}
