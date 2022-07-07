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
} from "./types/matrix-types";

export { makeRoomIdentifier } from "./types/matrix-types";
export { MatrixContextProvider } from "./components/MatrixContextProvider";
export { useMatrixStore } from "./store/use-matrix-store";
export { useMatrixClient } from "./hooks/use-matrix-client";
export { useSpace } from "./hooks/use-space";
export { useSpaceId } from "./hooks/use-space-id";
export { useWeb3Context, WalletStatus, Web3Provider } from "./hooks/use-web3";

// Workaround unhandled exception "Buffer is not defined" exception in keccak
import { Buffer } from "buffer";
window.Buffer = Buffer;
