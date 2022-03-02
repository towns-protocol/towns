import { MembershipType } from "matrix-js-sdk";
export declare enum Visibility {
    Private = "private",
    Public = "public"
}
export declare enum Membership {
    Join = "join",
    Invite = "invite",
    Leave = "leave"
}
export interface Room {
    roomId: string;
    name: string;
    membership: MembershipType | null;
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
export interface RoomsMessages {
    [roomId: string]: string[];
}
export interface CreateRoomInfo {
    roomName: string;
    visibility: Visibility;
    isDirectMessage?: boolean;
}
export declare function isRoom(room: any): room is Room;
