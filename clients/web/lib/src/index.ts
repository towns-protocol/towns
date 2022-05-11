export {
  LoginStatus,
  getUsernameFromId,
  getShortUsername,
} from "./hooks/login";

export { isRoom, Membership } from "./types/matrix-types";

export type {
  CreateRoomInfo,
  Member,
  Members,
  Room,
  Rooms,
  RoomMessage,
  RoomsMessages,
} from "./types/matrix-types";

export { MatrixContextProvider } from "./components/MatrixContextProvider";

export { useMatrixStore } from "./store/use-matrix-store";

export { useMatrixClient } from "./hooks/use-matrix-client";
export { useWeb3Context, WalletStatus, Web3Provider } from "./hooks/use-web3";

// Workaround unhandled exception "Buffer is not defined" exception in keccak
import { Buffer } from "buffer";
window.Buffer = Buffer;
