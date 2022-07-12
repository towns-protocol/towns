export { LoginStatus } from "./hooks/login";

export { isRoom, Membership } from "./types/matrix-types";

export type { UserIdentifier } from "./types/user-identifier";

export {
  createUserIdFromEthereumAddress,
  createUserIdFromString,
  getShortUsername,
  getUsernameFromId,
  isUserIdentifier,
} from "./types/user-identifier";

export type {
  Channel,
  ChannelGroup,
  CreateRoomInfo,
  CreateSpaceInfo,
  Member,
  Members,
  Room,
  RoomIdentifier,
  Rooms,
  RoomMessage,
  RoomsMessages,
  Space,
  SpaceChild,
  SpaceData,
} from "./types/matrix-types";

export { makeRoomIdentifier } from "./types/matrix-types";
export { MatrixContextProvider } from "./components/MatrixContextProvider";
export { useChannel } from "./hooks/use-channel";
export { useMatrixStore } from "./store/use-matrix-store";
export { useMatrixClient } from "./hooks/use-matrix-client";
export { useMessages } from "./hooks/use-messages";
export { useRoom } from "./hooks/use-room";
export {
  useSpace,
  useSpaces,
  useInvites,
  useInvitesForSpace,
  useInviteData,
} from "./hooks/use-space";
export { useSpaceId } from "./hooks/use-space-id";
export { useWeb3Context, WalletStatus, Web3Provider } from "./hooks/use-web3";

// Workaround unhandled exception "Buffer is not defined" exception in keccak
import { Buffer } from "buffer";
window.Buffer = Buffer;
