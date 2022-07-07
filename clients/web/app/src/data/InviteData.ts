import { RoomIdentifier } from "use-matrix-client";

export type InviteData = {
  id: RoomIdentifier;
  name: string;
  avatarSrc: string;
  bannerSrc?: string;
  isSpaceRoom: boolean;
};
