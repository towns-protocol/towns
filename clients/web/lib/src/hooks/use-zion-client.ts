import {
  CreateChannelInfo,
  CreateSpaceInfo,
  EditMessageOptions,
  PowerLevel,
  RoomIdentifier,
  SendMessageOptions,
  SpaceChild,
  ZionContext,
} from "../types/matrix-types";
import { useContext, useMemo } from "react";

import { MatrixContext } from "../components/MatrixContextProvider";
import { ZionClientEvent } from "../client/ZionClientTypes";
import { useJoinRoom } from "./MatrixClient/useJoinRoom";
import { useLoginWithPassword } from "./MatrixClient/useLoginWithPassword";
import { useLogout } from "./MatrixClient/useLogout";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMatrixWalletSignIn } from "./use-matrix-wallet-sign-in";
import { useRegisterPasswordUser } from "./MatrixClient/useRegisterPasswordUser";
import { useSyncSpace } from "./MatrixClient/useSyncSpace";

/**
 * Matrix client API to interact with the Matrix server.
 */
interface ZionClientImpl {
  clientRunning: boolean;
  createSpace: (
    createInfo: CreateSpaceInfo,
  ) => Promise<RoomIdentifier | undefined>;
  createChannel: (
    createInfo: CreateChannelInfo,
  ) => Promise<RoomIdentifier | undefined>;
  getIsWalletIdRegistered: () => Promise<boolean>;
  inviteUser: (roomId: RoomIdentifier, userId: string) => Promise<void>;
  joinRoom: (roomId: RoomIdentifier) => Promise<void>;
  leaveRoom: (roomId: RoomIdentifier) => Promise<void>;
  logout: () => Promise<void>;
  loginWithPassword: (username: string, password: string) => Promise<void>;
  loginWithWallet: (statement: string) => Promise<void>;
  registerPasswordUser: (username: string, password: string) => Promise<void>;
  registerWallet: (statement: string) => Promise<void>;
  scrollback(roomId: RoomIdentifier, limit?: number): Promise<void>;
  sendMessage: (
    roomId: RoomIdentifier,
    message: string,
    options?: SendMessageOptions,
  ) => Promise<void>;
  sendNotice: (roomId: RoomIdentifier, message: string) => Promise<void>;
  editMessage: (
    roomId: RoomIdentifier,
    message: string,
    options: EditMessageOptions,
  ) => Promise<void>;
  setPowerLevel: (
    roomId: RoomIdentifier,
    current: string | PowerLevel,
    newValue: number,
  ) => Promise<void>;
  setAvatarUrl: (ravatarUrl: string) => Promise<void>;
  setDisplayName: (displayName: string) => Promise<void>;
  syncSpace: (spaceId: RoomIdentifier) => Promise<SpaceChild[]>;
}

export function useZionClient(): ZionClientImpl {
  const { getIsWalletIdRegistered, loginWithWallet, registerWallet } =
    useMatrixWalletSignIn();
  const { triggerZionClientEvent } = useMatrixStore();
  const { client } = useContext<ZionContext>(MatrixContext);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const withCatch = <T extends Array<any>, U>(
    fn?: (...args: T) => Promise<U | undefined>,
    event: ZionClientEvent | undefined = undefined,
  ) => {
    return (...args: T): Promise<U | undefined> => {
      if (client && fn) {
        try {
          return fn.apply(client, args).then((value: U | undefined) => {
            if (event) {
              triggerZionClientEvent(event);
            }
            return value;
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (ex: any) {
          console.error("Error", ex.stack, ex);
          return Promise.resolve(undefined);
        }
      } else {
        console.error("Not logged in");
        return Promise.resolve(undefined);
      }
    };
  };

  const clientRunning = useMemo(() => client !== undefined, [client]);
  const joinRoom = useJoinRoom();
  const loginWithPassword = useLoginWithPassword();
  const logout = useLogout();
  const registerPasswordUser = useRegisterPasswordUser();
  const syncSpace = useSyncSpace();

  return {
    clientRunning,
    createChannel: withCatch(client?.createChannel),
    createSpace: withCatch(client?.createSpace),
    getIsWalletIdRegistered,
    inviteUser: withCatch(client?.inviteUser),
    joinRoom,
    leaveRoom: withCatch(client?.leave),
    loginWithPassword,
    loginWithWallet,
    logout,
    registerPasswordUser,
    registerWallet,
    scrollback: withCatch(client?.scrollback),
    sendMessage: withCatch(client?.sendMessage),
    sendNotice: withCatch(client?.sendNotice),
    editMessage: withCatch(client?.editMessage),
    setPowerLevel: withCatch(client?.setPowerLevel),
    syncSpace,
    setDisplayName: withCatch(client?.setDisplayName),
    setAvatarUrl: withCatch(client?.setAvatarUrl),
  };
}
