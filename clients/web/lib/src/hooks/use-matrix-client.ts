import {
  CreateRoomInfo,
  CreateSpaceInfo,
  RoomIdentifier,
  SpaceChild,
} from "../types/matrix-types";
import { useMatrixWalletSignIn } from "./use-matrix-wallet-sign-in";
import { useSyncSpace } from "./MatrixClient/useSyncSpace";
import { useCreateSpace } from "./MatrixClient/useCreateSpace";
import { useCreateRoom } from "./MatrixClient/useCreateRoom";
import { useLogout } from "./MatrixClient/useLogout";
import { useLoginWithPassword } from "./MatrixClient/useLoginWithPassword";
import { useRegisterPasswordUser } from "./MatrixClient/useRegisterPasswordUser";
import { useSendMessage } from "./MatrixClient/useSendMessage";
import { useLeaveRoom } from "./MatrixClient/useLeaveRoom";
import { useInviteUser } from "./MatrixClient/useInviteUser";
import { useJoinRoom } from "./MatrixClient/useJoinRoom";

/**
 * Matrix client API to interact with the Matrix server.
 */
// prettier-ignore
export function useMatrixClient() {
  const { getIsWalletIdRegistered, loginWithWallet, registerWallet } =
    useMatrixWalletSignIn();

  const syncSpace: (spaceId: RoomIdentifier) => Promise<SpaceChild[]> = useSyncSpace();
  const createSpace: (createSpaceInfo: CreateSpaceInfo) => Promise<RoomIdentifier | undefined> = useCreateSpace();
  const createRoom: (createInfo: CreateRoomInfo) => Promise<RoomIdentifier | undefined> = useCreateRoom();
  const logout: () => Promise<void> = useLogout();
  const loginWithPassword: (username: string, password: string) => Promise<void> = useLoginWithPassword();
  const registerPasswordUser: (username: string, password: string) => Promise<void> = useRegisterPasswordUser();
  const sendMessage: (roomId: RoomIdentifier, message: string) => Promise<void> = useSendMessage();
  const leaveRoom: (roomId: RoomIdentifier) => Promise<void> = useLeaveRoom();
  const inviteUser: (roomId: RoomIdentifier, userId: string) => Promise<void> = useInviteUser();
  const joinRoom: (roomId: RoomIdentifier) => Promise<void> = useJoinRoom();

  return {
    createRoom,
    createSpace,
    getIsWalletIdRegistered,
    inviteUser,
    joinRoom,
    leaveRoom,
    loginWithPassword,
    loginWithWallet,
    logout,
    registerPasswordUser,
    registerWallet,
    sendMessage,
    syncSpace,
  };
}
