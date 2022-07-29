import { useContext, useMemo } from "react";
import { MatrixContext } from "../components/MatrixContextProvider";
import {
  CreateRoomInfo,
  CreateSpaceInfo,
  RoomIdentifier,
  SpaceChild,
  ZionContext,
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
import { useSetPowerLevel } from "./MatrixClient/useSetPowerLevel";
import { useSetAvatarUrl } from "./MatrixClient/useSetAvatarUrl";
import { useSetDisplayName } from "./MatrixClient/useSetDisplayName";

/**
 * Matrix client API to interact with the Matrix server.
 */
// prettier-ignore
export function useMatrixClient() {
  const { getIsWalletIdRegistered, loginWithWallet, registerWallet } =
    useMatrixWalletSignIn();
  const { matrixClient } = useContext<ZionContext>(MatrixContext);

  const clientRunning = useMemo(() => matrixClient != null && matrixClient.clientRunning, [matrixClient]); 
  const syncSpace: (spaceId: RoomIdentifier) => Promise<SpaceChild[]> = useSyncSpace();
  const createSpace: (createSpaceInfo: CreateSpaceInfo) => Promise<RoomIdentifier | undefined> = useCreateSpace();
  const createRoom: (createInfo: CreateRoomInfo) => Promise<RoomIdentifier | undefined> = useCreateRoom();
  const logout: () => Promise<void> = useLogout();
  const loginWithPassword: (username: string, password: string) => Promise<void> = useLoginWithPassword();
  const registerPasswordUser: (username: string, password: string) => Promise<void> = useRegisterPasswordUser();
  const sendMessage = useSendMessage();
  const setPowerLevel = useSetPowerLevel();
  const leaveRoom: (roomId: RoomIdentifier) => Promise<void> = useLeaveRoom();
  const inviteUser: (roomId: RoomIdentifier, userId: string) => Promise<void> = useInviteUser();
  const joinRoom: (roomId: RoomIdentifier) => Promise<void> = useJoinRoom();
  const setDisplayName = useSetDisplayName();
  const setAvatarUrl = useSetAvatarUrl();

  return {
    clientRunning,
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
    setPowerLevel,
    syncSpace,
    setDisplayName,
    setAvatarUrl
  };
}
