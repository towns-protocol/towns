/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import { MatrixEvent, Room, RoomMember } from "matrix-js-sdk";

export interface ZionOpts {
  homeServerUrl: string;
  initialSyncLimit: number;
  disableEncryption?: boolean;
  getProvider: () => ethers.providers.Provider | undefined;
  getSigner: () => ethers.Signer | undefined;
}

export interface ZionAuth {
  userId: string;
  accessToken: string;
  deviceId: string;
}

export interface StartClientOpts {
  onRoomTimelineEvent?: (
    event: MatrixEvent,
    room: Room,
    toStartOfTimeline: boolean,
    removed: any,
    data: any,
  ) => void;
  onRoomMembershipEvent?: (
    event: MatrixEvent,
    member: RoomMember,
    oldMembership: string | null,
  ) => void;
}
export enum ZionClientEvent {
  NewSpace = "ZionClient.NewSpace",
}
