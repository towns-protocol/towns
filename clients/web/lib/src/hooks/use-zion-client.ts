import { BigNumber } from "ethers";
import {
  CreateChannelInfo,
  CreateSpaceInfo,
  EditMessageOptions,
  PowerLevel,
  RoomIdentifier,
  SendMessageOptions,
  SpaceChild,
} from "../types/matrix-types";

import { DataTypes } from "@harmony/contracts/governance/src/contracts/zion-governance/contracts/spaces/ZionSpaceManager";
import { ZionClientEvent } from "../client/ZionClientTypes";
import { useJoinRoom } from "./MatrixClient/useJoinRoom";
import { useLoginWithPassword } from "./MatrixClient/useLoginWithPassword";
import { useLogout } from "./MatrixClient/useLogout";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMatrixWalletSignIn } from "./use-matrix-wallet-sign-in";
import { useMemo } from "react";
import { useRegisterPasswordUser } from "./MatrixClient/useRegisterPasswordUser";
import { useSyncSpace } from "./MatrixClient/useSyncSpace";
import { useZionContext } from "../components/ZionContextProvider";

/**
 * Matrix client API to interact with the Matrix server.
 */
interface ZionClientImpl {
  clientRunning: boolean;
  createSpace: (
    createInfo: CreateSpaceInfo,
  ) => Promise<RoomIdentifier | undefined>;
  createWeb3Space: (createInfo: CreateSpaceInfo) => Promise<unknown>;
  createChannel: (
    createInfo: CreateChannelInfo,
  ) => Promise<RoomIdentifier | undefined>;
  editMessage: (
    roomId: RoomIdentifier,
    message: string,
    options: EditMessageOptions,
  ) => Promise<void>;
  getIsWalletIdRegistered: () => Promise<boolean>;
  getSpace: (
    spaceId: BigNumber,
  ) => Promise<DataTypes.SpaceInfoStructOutput | undefined>;
  getSpaces: () => Promise<DataTypes.SpaceInfoStructOutput[] | undefined>;
  inviteUser: (roomId: RoomIdentifier, userId: string) => Promise<void>;
  joinRoom: (roomId: RoomIdentifier) => Promise<void>;
  leaveRoom: (roomId: RoomIdentifier) => Promise<void>;
  logout: () => Promise<void>;
  loginWithPassword: (username: string, password: string) => Promise<void>;
  loginWithWallet: (statement: string) => Promise<void>;
  redactEvent: (
    roomId: RoomIdentifier,
    eventId: string,
    reason?: string,
  ) => Promise<void>;
  registerPasswordUser: (username: string, password: string) => Promise<void>;
  registerWallet: (statement: string) => Promise<void>;
  scrollback: (roomId: RoomIdentifier, limit?: number) => Promise<void>;
  sendMessage: (
    roomId: RoomIdentifier,
    message: string,
    options?: SendMessageOptions,
  ) => Promise<void>;
  sendNotice: (roomId: RoomIdentifier, message: string) => Promise<void>;
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
  const { client } = useZionContext();

  const clientRunning = useMemo(() => client !== undefined, [client]);
  const joinRoom = useJoinRoom();
  const loginWithPassword = useLoginWithPassword();
  const logout = useLogout();
  const registerPasswordUser = useRegisterPasswordUser();
  const syncSpace = useSyncSpace();

  return {
    clientRunning,
    createChannel: useWithCatch(client?.createChannel.bind(client)),
    createSpace: useWithCatch(client?.createSpace.bind(client)),
    createWeb3Space: useWithCatch(
      client?.createWeb3Space.bind(client),
      ZionClientEvent.NewSpace,
    ),
    editMessage: useWithCatch(client?.editMessage.bind(client)),
    getIsWalletIdRegistered,
    getSpace: useWithCatch(client?.getSpace.bind(client)),
    getSpaces: useWithCatch(client?.getSpaces.bind(client)),
    inviteUser: useWithCatch(client?.inviteUser.bind(client)),
    joinRoom,
    leaveRoom: useWithCatch(client?.leave.bind(client)),
    loginWithPassword,
    loginWithWallet,
    logout,
    redactEvent: useWithCatch(client?.redactEvent.bind(client)),
    registerPasswordUser,
    registerWallet,
    scrollback: useWithCatch(client?.scrollback.bind(client)),
    sendMessage: useWithCatch(client?.sendMessage.bind(client)),
    sendNotice: useWithCatch(client?.sendNotice.bind(client)),
    setPowerLevel: useWithCatch(client?.setPowerLevel.bind(client)),
    syncSpace,
    setDisplayName: useWithCatch(client?.setDisplayName.bind(client)),
    setAvatarUrl: useWithCatch(client?.setAvatarUrl.bind(client)),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useWithCatch = <T extends Array<any>, U>(
  fn?: (...args: T) => Promise<U | undefined>,
  event: ZionClientEvent | undefined = undefined,
) => {
  const { triggerZionClientEvent } = useMatrixStore();
  return useMemo(
    () =>
      async (...args: T): Promise<U | undefined> => {
        if (fn) {
          try {
            const value = await fn(...args);
            if (event) {
              triggerZionClientEvent(event);
            }
            return value;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (ex: any) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            console.error("Error", ex.stack, ex);
            return Promise.resolve(undefined);
          }
        } else {
          console.log("useZionClient: Not logged in");
          return Promise.resolve(undefined);
        }
      },
    [triggerZionClientEvent, fn, event],
  );
};
