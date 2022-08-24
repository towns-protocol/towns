export { MatrixContextProvider } from "./components/MatrixContextProvider";
export { useChannel } from "./hooks/use-channel";
export { LoginStatus, getChainIdEip155 } from "./hooks/login";
export { useMatrixStore } from "./store/use-matrix-store";
export { useZionClient } from "./hooks/use-zion-client";
export { useMember } from "./hooks/use-member";
export { useMessages } from "./hooks/use-messages";
export { useMyMembership } from "./hooks/use-my-membership";
export { useMyProfile } from "./hooks/use-my-profile";
export { usePowerLevels } from "./hooks/use-power-levels";
export { useRoom } from "./hooks/use-room";
export {
  useSpace,
  useInvites,
  useInvitesForSpace,
  useInviteData,
} from "./hooks/use-space";
export { useSpaces, useSpacesFromContract } from "./hooks/use-spaces";
export { useSpaceId } from "./hooks/use-space-id";
export { useWeb3Context, WalletStatus, Web3Provider } from "./hooks/use-web3";

export type {
  Channel,
  ChannelGroup,
  CreateChannelInfo,
  CreateSpaceInfo,
  Member,
  Members,
  PowerLevel,
  PowerLevels,
  PowerLevelDefinition,
  Room,
  RoomIdentifier,
  Rooms,
  RoomMessage,
  RoomsMessages,
  SendMessageOptions,
  SpaceChild,
  SpaceData,
} from "./types/matrix-types";

export type { Space, SpaceIdentifier } from "./client/ZionClientTypes";

export {
  isRoom,
  makeRoomIdentifier,
  Membership,
  MessageType,
  RoomVisibility,
} from "./types/matrix-types";

export type { UserIdentifier } from "./types/user-identifier";

export {
  createUserIdFromEthereumAddress,
  createUserIdFromString,
  getShortUsername,
  getUsernameFromId,
  isUserIdentifier,
} from "./types/user-identifier";
