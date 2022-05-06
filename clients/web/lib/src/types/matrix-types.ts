export enum Visibility {
  Private = "private",
  Public = "public",
}

export enum Membership {
  Join = "join",
  Invite = "invite",
  Leave = "leave",
}

export interface Room {
  roomId: string;
  name: string;
  membership: string;
  members: Members;
  inviter?: string;
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

export interface CreateRoomInfo {
  roomName: string;
  visibility: Visibility;
  isDirectMessage?: boolean;
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
