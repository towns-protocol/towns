import { CouncilNFT, ZionSpaceManager } from "@harmony/contracts/governance";
import {
  CreateChannelInfo,
  CreateSpaceInfo,
  EditMessageOptions,
  PowerLevel,
  RoomIdentifier,
  SendMessageOptions,
} from "../types/matrix-types";

/* eslint-disable @typescript-eslint/unbound-method */
import { DataTypes } from "@harmony/contracts/governance/src/contracts/zion-governance/contracts/spaces/ZionSpaceManager";
import { ZionClientEvent } from "../client/ZionClientTypes";
import { ZionContractProvider } from "client/web3/ZionContractProvider";
import { useJoinRoom } from "./MatrixClient/useJoinRoom";
import { useLoginWithPassword } from "./MatrixClient/useLoginWithPassword";
import { useLogout } from "./MatrixClient/useLogout";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMatrixWalletSignIn } from "./use-matrix-wallet-sign-in";
import { useMemo } from "react";
import { useRegisterPasswordUser } from "./MatrixClient/useRegisterPasswordUser";
import { useZionContext } from "../components/ZionContextProvider";
import { MatrixSpaceHierarchy } from "../client/matrix/SyncSpace";

/**
 * Matrix client API to interact with the Matrix server.
 */
interface ZionClientImpl {
  clientRunning: boolean;
  councilNFT: ZionContractProvider<CouncilNFT> | undefined;
  spaceManager: ZionContractProvider<ZionSpaceManager> | undefined;
  createSpace: (
    createInfo: CreateSpaceInfo,
  ) => Promise<RoomIdentifier | undefined>;
  createWeb3Space: (
    createInfo: CreateSpaceInfo,
  ) => Promise<RoomIdentifier | undefined>;
  createWeb3SpaceWithTokenEntitlement: (
    createInfo: CreateSpaceInfo,
    tokenEntitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct,
  ) => Promise<RoomIdentifier | undefined>;
  createChannel: (
    createInfo: CreateChannelInfo,
  ) => Promise<RoomIdentifier | undefined>;
  editMessage: (
    roomId: RoomIdentifier,
    message: string,
    options: EditMessageOptions,
  ) => Promise<void>;
  getIsWalletIdRegistered: () => Promise<boolean>;
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
  sendReaction: (
    roomId: RoomIdentifier,
    eventId: string,
    reaction: string,
  ) => Promise<void>;
  sendReadReceipt: (roomId: RoomIdentifier, eventId: string) => Promise<void>;
  setPowerLevel: (
    roomId: RoomIdentifier,
    current: string | PowerLevel,
    newValue: number,
  ) => Promise<void>;
  setAvatarUrl: (ravatarUrl: string) => Promise<void>;
  setDisplayName: (displayName: string) => Promise<void>;
  syncSpace: (
    spaceId: RoomIdentifier,
  ) => Promise<MatrixSpaceHierarchy | undefined>;
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

  return {
    clientRunning,
    councilNFT: client?.councilNFT,
    spaceManager: client?.spaceManager,
    createChannel: useWithCatch(client?.createChannel),
    createSpace: useWithCatch(client?.createSpace),
    createWeb3Space: useWithCatch(
      client?.createWeb3Space,
      ZionClientEvent.NewSpace,
    ),
    createWeb3SpaceWithTokenEntitlement: useWithCatch(
      client?.createWeb3SpaceWithTokenEntitlement,
      ZionClientEvent.NewSpace,
    ),
    editMessage: useWithCatch(client?.editMessage),
    getIsWalletIdRegistered,
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
    sendReaction: useWithCatch(client?.sendReaction),
    sendNotice: useWithCatch(client?.sendNotice),
    sendReadReceipt: useWithCatch(client?.sendReadReceipt),
    setPowerLevel: useWithCatch(client?.setPowerLevel),
    syncSpace: useWithCatch(client?.syncSpace),
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
  const client = useZionContext().client;
  return useMemo(
    () =>
      async (...args: T): Promise<U | undefined> => {
        if (fn && client) {
          try {
            const value = await fn.apply(client, args);
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
    [fn, client, event, triggerZionClientEvent],
  );
};
