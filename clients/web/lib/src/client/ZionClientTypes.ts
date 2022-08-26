/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumberish, ethers } from "ethers";
import { MatrixEvent, Room, RoomMember } from "matrix-js-sdk";

export interface ZionOpts {
  homeServerUrl: string;
  initialSyncLimit: number;
  disableEncryption?: boolean;
  spaceManagerAddress: string;
  userModuleAddress: string;
  councilNFTAddress: string;
  councilStakingAddress: string;
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

export interface SpaceIdentifier {
  name: string;
  id: BigNumberish;
  key: string;
}

export interface Space {
  spaceId: BigNumberish;
  name: string;
  createdAt: Date;
  creatorAddress: string;
  ownerAddress: string;
}

export enum ZionClientEvent {
  NewSpace = "ZionClient.NewSpace",
}
