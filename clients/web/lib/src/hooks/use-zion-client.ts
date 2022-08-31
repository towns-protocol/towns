/* eslint-disable @typescript-eslint/unbound-method */
import { useMemo } from "react";
import {
  CreateChannelInfo,
  CreateSpaceInfo,
  EditMessageOptions,
  PowerLevel,
  RoomIdentifier,
  SendMessageOptions,
  SpaceChild,
} from "../types/matrix-types";
import { useJoinRoom } from "./MatrixClient/useJoinRoom";
import { useLoginWithPassword } from "./MatrixClient/useLoginWithPassword";
import { useLogout } from "./MatrixClient/useLogout";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMatrixWalletSignIn } from "./use-matrix-wallet-sign-in";
import { useRegisterPasswordUser } from "./MatrixClient/useRegisterPasswordUser";
import { useSyncSpace } from "./MatrixClient/useSyncSpace";
import { ZionClientEvent } from "../client/ZionClientTypes";
import { BigNumber, BigNumberish } from "ethers";
import { ZionSpaceManager } from "@harmony/contracts/governance";
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
  getSpace: (spaceId: BigNumberish) => Promise<
    | ([BigNumber, BigNumber, string, string, string] & {
        spaceId: BigNumber;
        createdAt: BigNumber;
        name: string;
        creatorAddress: string;
        ownerAddress: string;
      })
    | undefined
  >;
  getSpaces: () => Promise<
    ZionSpaceManager.SpaceNameIDStructOutput[] | undefined
  >;
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
  scrollback(roomId: RoomIdentifier, limit?: number): Promise<void>;
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
    createChannel: useWithCatch(client?.createChannel),
    createSpace: useWithCatch(client?.createSpace),
    createWeb3Space: useWithCatch(
      client?.createWeb3Space,
      ZionClientEvent.NewSpace,
    ),
    editMessage: useWithCatch(client?.editMessage),
    getIsWalletIdRegistered,
    getSpace: useWithCatch(client?.getSpace),
    getSpaces: useWithCatch(client?.getSpaces),
    inviteUser: useWithCatch(client?.inviteUser),
    joinRoom,
    leaveRoom: useWithCatch(client?.leave),
    loginWithPassword,
    loginWithWallet,
    logout,
    redactEvent: useWithCatch(client?.redactEvent),
    registerPasswordUser,
    registerWallet,
    scrollback: useWithCatch(client?.scrollback),
    sendMessage: useWithCatch(client?.sendMessage),
    sendNotice: useWithCatch(client?.sendNotice),
    setPowerLevel: useWithCatch(client?.setPowerLevel),
    syncSpace,
    setDisplayName: useWithCatch(client?.setDisplayName),
    setAvatarUrl: useWithCatch(client?.setAvatarUrl),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useWithCatch = <T extends Array<any>, U>(
  fn?: (...args: T) => Promise<U | undefined>,
  event: ZionClientEvent | undefined = undefined,
) => {
  const { triggerZionClientEvent } = useMatrixStore();
  const { client } = useZionContext();
  return useMemo(
    () =>
      (...args: T): Promise<U | undefined> => {
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            console.error("Error", ex.stack, ex);
            return Promise.resolve(undefined);
          }
        } else {
          console.log("useZionClient: Not logged in");
          return Promise.resolve(undefined);
        }
      },
    [client, triggerZionClientEvent, fn, event],
  );
};
