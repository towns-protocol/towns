import {
  ClientEvent,
  EventType,
  MatrixClient,
  MatrixEvent,
  MatrixEventEvent,
  Room as MatrixRoom,
  PendingEventOrdering,
  RelationType,
  RoomEvent,
  RoomMemberEvent,
  User,
  UserEvent,
  IRoomTimelineData,
  createClient,
} from "matrix-js-sdk";
import { ContractReceipt, ContractTransaction, ethers } from "ethers";
import {
  CouncilNFT,
  ZionSpaceManager,
} from "@harmony/contracts/localhost/typings";
import {
  CreateChannelInfo,
  CreateSpaceInfo,
  EditMessageOptions,
  PowerLevel,
  PowerLevels,
  RoomIdentifier,
  SendMessageOptions,
} from "../types/matrix-types";
import { LoginTypePublicKey, RegisterRequest } from "../hooks/login";
import {
  NewSession,
  newRegisterSession,
} from "../hooks/use-matrix-wallet-sign-in";
import {
  IZionServerVersions,
  StartClientOpts,
  ZionAuth,
  ZionOpts,
} from "./ZionClientTypes";
import { zionCouncilNFTAbi, zionSpaceManagerAbi } from "./web3/ZionAbis";

import { DataTypes } from "@harmony/contracts/localhost/typings/types/ZionSpaceManager";
import { ZionContractProvider } from "./web3/ZionContractProvider";
import { createZionChannel } from "./matrix/CreateChannel";
import { createZionSpace } from "./matrix/CreateSpace";
import { editZionMessage } from "./matrix/EditMessage";
import { enrichPowerLevels } from "./matrix/PowerLevels";
import { inviteZionUser } from "./matrix/InviteUser";
import { joinZionRoom } from "./matrix/Join";
import { sendZionMessage } from "./matrix/SendMessage";
import { setZionPowerLevel } from "./matrix/SetPowerLevels";
import { syncZionSpace } from "./matrix/SyncSpace";
import { CustomMemoryStore } from "./store/CustomMatrixStore";
import { ISyncStateData, SyncState } from "matrix-js-sdk/lib/sync";
import { IStore } from "matrix-js-sdk/lib/store";
import { getContractAddresses } from "./web3/ZionContractAddresses";

/***
 * Zion Client
 * mostly a "passthrough" abstraction that hides the underlying MatrixClient
 * normally, a shitty design pattern, but in zions case we want to
 * - always encrypt
 * - enforce space / channel relationships
 * - get user wallet info
 * - go to the blockchain when creating a space
 * - go to the blockchain when updating power levels
 * - etc
 * the zion client will wrap the underlying matrix client and
 * ensure correct zion protocol business logic
 */
export class ZionClient {
  public readonly opts: ZionOpts;
  public readonly name: string;
  public store: CustomMemoryStore;
  public get auth(): ZionAuth | undefined {
    return this._auth;
  }
  /// chain id at the time the contracts were created
  /// contracts are recreated when the client is started
  public get chainId(): number {
    return this._chainId;
  }
  public spaceManager: ZionContractProvider<ZionSpaceManager>;
  public councilNFT: ZionContractProvider<CouncilNFT>;
  private _chainId: number;
  private _auth?: ZionAuth;
  private client: MatrixClient;

  constructor(opts: ZionOpts, chainId?: number, name?: string) {
    this.opts = opts;
    this.name = name || "";
    this._chainId = chainId ?? 0;
    console.log("~~~ new ZionClient ~~~", this.name, this.opts);
    ({ client: this.client, store: this.store } = ZionClient.createMatrixClient(
      opts.homeServerUrl,
      this._auth,
    ));
    ({ spaceManager: this.spaceManager, councilNFT: this.councilNFT } =
      ZionClient.createContracts(
        opts.getProvider,
        opts.getSigner,
        this._chainId,
      ));
  }

  /************************************************
   * getVersion
   *************************************************/
  public async getServerVersions() {
    const version = await this.client.getVersions();
    return version as IZionServerVersions;
  }

  /************************************************
   * logout
   *************************************************/
  public async logout(): Promise<void> {
    if (!this.auth) {
      throw new Error("not authenticated");
    }
    this.stopClient();
    await this.client.logout();
    this._auth = undefined;
    ({ client: this.client, store: this.store } = ZionClient.createMatrixClient(
      this.opts.homeServerUrl,
      this._auth,
    ));
  }

  /************************************************
   * preRegister
   * set up a registration request, will fail if
   * our wallet is already registered
   ************************************************/
  public async preRegister(walletAddress: string): Promise<NewSession> {
    if (this.auth) {
      throw new Error("already registered");
    }
    return await newRegisterSession(this.client, walletAddress);
  }

  /************************************************
   * register
   * register wallet with matrix, if successful will
   * return params that allow you to call start client
   *************************************************/
  public async register(request: RegisterRequest): Promise<ZionAuth> {
    if (this.auth) {
      throw new Error("already registered");
    }
    const { access_token, device_id, user_id } =
      await this.client.registerRequest(request, LoginTypePublicKey);
    if (!access_token || !device_id || !user_id) {
      throw new Error("failed to register");
    }
    return {
      accessToken: access_token,
      deviceId: device_id,
      userId: user_id,
    };
  }

  /************************************************
   * startClient
   * start the matrix client, add listeners
   *************************************************/
  public async startClient(
    auth: ZionAuth,
    chainId: number,
    startOpts?: StartClientOpts,
  ) {
    if (this.auth) {
      throw new Error("already authenticated");
    }
    if (this.client.clientRunning) {
      throw new Error("client already running");
    }
    // stop everything
    this.stopClient();
    // log startOpts
    this.log("Starting client", startOpts);
    // set auth, chainId
    this._auth = auth;
    this._chainId = chainId;
    // new contracts
    ({ spaceManager: this.spaceManager, councilNFT: this.councilNFT } =
      ZionClient.createContracts(
        this.opts.getProvider,
        this.opts.getSigner,
        this.chainId,
      ));
    // new client
    ({ client: this.client, store: this.store } = ZionClient.createMatrixClient(
      this.opts.homeServerUrl,
      this._auth,
    ));
    // start it up, this begins a sync command
    if (!this.opts.disableEncryption) {
      await this.client.initCrypto();
      // disable log...
      this.client.setGlobalErrorOnUnknownDevices(false);
    }
    // start client
    await this.client.startClient({
      pendingEventOrdering: PendingEventOrdering.Chronological,
      initialSyncLimit: this.opts.initialSyncLimit,
    });
    // wait for the sync to complete
    const initialSync = new Promise<string>((resolve, reject) => {
      this.client.once(
        ClientEvent.Sync,
        (state: SyncState, prevState: unknown, res: unknown) => {
          if (state === SyncState.Prepared) {
            this.log("initial sync complete", this.client.getRooms());
            resolve(state);
          } else {
            this.log("Unhandled sync event:", state, prevState, res);
            reject(new Error(state as string));
          }
        },
      );
    });
    await initialSync;
    // listen for timeline events
    const onRoomTimelineEvent = startOpts?.onRoomTimelineEvent;
    if (onRoomTimelineEvent) {
      this.client.on(RoomEvent.Timeline, onRoomTimelineEvent);

      this.client.on(MatrixEventEvent.Decrypted, (event: MatrixEvent) => {
        const roomId = event.getRoomId();
        if (roomId) {
          const room = this.client.getRoom(roomId);
          if (room) {
            onRoomTimelineEvent(event, room, false, false, {});
          }
        }
      });
    }
    // listen for membership events
    const onRoomMembershipEvent = startOpts?.onRoomMembershipEvent;
    if (onRoomMembershipEvent) {
      this.client.on(RoomMemberEvent.Membership, onRoomMembershipEvent);
    }
  }

  /************************************************
   * stopClient
   *************************************************/
  public stopClient() {
    this.client.stopClient();
    this.client.removeAllListeners();
    this.log("stopped client");
  }

  /************************************************
   * createWeb3Space
   *************************************************/
  public async createWeb3Space(
    createSpaceInfo: CreateSpaceInfo,
  ): Promise<RoomIdentifier | undefined> {
    let roomIdentifier: RoomIdentifier | undefined = await this.createSpace(
      createSpaceInfo,
    );

    console.log("[createWeb3Space] Matrix createSpace", roomIdentifier);

    if (roomIdentifier) {
      const spaceInfo: DataTypes.CreateSpaceDataStruct = {
        spaceName: createSpaceInfo.name,
        networkId: roomIdentifier.matrixRoomId,
      };

      let transaction: ContractTransaction | undefined = undefined;
      let receipt: ContractReceipt | undefined = undefined;
      try {
        transaction = await this.spaceManager.signed.createSpace(spaceInfo);
        receipt = await transaction.wait();
      } finally {
        if (receipt?.status === 1) {
          // Successful created the space on-chain.
          console.log("[createWeb3Space] createSpace successful");
        } else {
          console.log("[createWeb3Space] createSpace failed");
          // On-chain space creation failed. Abandon this space.
          await this.leave(roomIdentifier);
          roomIdentifier = undefined;
        }
      }
    }

    return roomIdentifier;
  }

  /************************************************
   * createWeb3SpaceWithTokenEntitlement
   *************************************************/
  public async createWeb3SpaceWithTokenEntitlement(
    createSpaceInfo: CreateSpaceInfo,
    tokenEntitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct,
  ): Promise<RoomIdentifier | undefined> {
    let roomIdentifier: RoomIdentifier | undefined = await this.createSpace(
      createSpaceInfo,
    );

    console.log(
      "[createWeb3SpaceWithTokenEntitlement] Matrix createSpace",
      roomIdentifier,
    );

    if (roomIdentifier) {
      const spaceInfo: DataTypes.CreateSpaceDataStruct = {
        spaceName: createSpaceInfo.name,
        networkId: roomIdentifier.matrixRoomId,
      };

      let transaction: ContractTransaction | undefined = undefined;
      let receipt: ContractReceipt | undefined = undefined;
      try {
        transaction =
          await this.spaceManager.signed.createSpaceWithTokenEntitlement(
            spaceInfo,
            tokenEntitlement,
          );
        receipt = await transaction.wait();
      } finally {
        if (receipt?.status === 1) {
          // Successful created the space on-chain.
          const spaceId =
            await this.spaceManager.unsigned.getSpaceIdByNetworkId(
              roomIdentifier.matrixRoomId,
            );
          console.log(
            "[createWeb3SpaceWithTokenEntitlement] createSpaceWithTokenEntitlement successful",
            {
              spaceId,
              matrixRoomId: roomIdentifier.matrixRoomId,
            },
          );
        } else {
          // On-chain space creation failed. Abandon this space.
          console.log(
            "[createWeb3SpaceWithTokenEntitlement] createSpaceWithTokenEntitlement failed",
          );
          await this.leave(roomIdentifier);
          roomIdentifier = undefined;
        }
      }
    }

    return roomIdentifier;
  }

  /************************************************
   * createSpace
   *************************************************/
  public async createSpace(
    createSpaceInfo: CreateSpaceInfo,
  ): Promise<RoomIdentifier> {
    return createZionSpace({
      matrixClient: this.client,
      createSpaceInfo,
      disableEncryption: this.opts.disableEncryption,
    });
  }

  /************************************************
   * createChannel
   *************************************************/
  public async createChannel(
    createInfo: CreateChannelInfo,
  ): Promise<RoomIdentifier> {
    return createZionChannel({
      matrixClient: this.client,
      homeServer: this.opts.homeServerUrl,
      createInfo: createInfo,
      disableEncryption: this.opts.disableEncryption,
    });
  }

  /************************************************
   * inviteUser
   *************************************************/
  public async inviteUser(roomId: RoomIdentifier, userId: string) {
    return inviteZionUser({ matrixClient: this.client, userId, roomId });
  }

  /************************************************
   * leave
   * ************************************************/
  // eslint-disable-next-line @typescript-eslint/ban-types
  public async leave(roomId: RoomIdentifier): Promise<void> {
    await this.client.leave(roomId.matrixRoomId);
  }

  /************************************************
   * joinRoom
   * at the time of writing, both spaces and channels are
   * identified by a room id, this function handls joining both
   *************************************************/
  public async joinRoom(roomId: RoomIdentifier) {
    return await joinZionRoom({ matrixClient: this.client, roomId });
  }

  /************************************************
   * sendMessage
   *************************************************/
  public async sendMessage(
    roomId: RoomIdentifier,
    message: string,
    options: SendMessageOptions = {},
  ) {
    return await sendZionMessage({
      matrixClient: this.client,
      roomId,
      message,
      options,
    });
  }

  public async sendReaction(
    roomId: RoomIdentifier,
    eventId: string,
    reaction: string,
  ): Promise<void> {
    const newEventId = await this.client.sendEvent(
      roomId.matrixRoomId,
      EventType.Reaction,
      {
        "m.relates_to": {
          rel_type: RelationType.Annotation,
          event_id: eventId,
          key: reaction,
        },
      },
    );
    console.log("sendReaction", newEventId);
  }

  /************************************************
   * sendMessage
   *************************************************/
  public async editMessage(
    roomId: RoomIdentifier,
    message: string,
    options: EditMessageOptions,
  ) {
    return await editZionMessage({
      matrixClient: this.client,
      roomId,
      message,
      options,
    });
  }

  /************************************************
   * redactEvent
   *************************************************/
  public async redactEvent(
    roomId: RoomIdentifier,
    eventId: string,
    reason?: string,
  ) {
    const resp = await this.client.redactEvent(
      roomId.matrixRoomId,
      eventId,
      undefined,
      {
        reason,
      },
    );
    console.log("event redacted", roomId.matrixRoomId, eventId, resp);
  }
  /************************************************
   * sendNotice
   *************************************************/
  public async sendNotice(
    roomId: RoomIdentifier,
    message: string,
  ): Promise<void> {
    await this.client.sendNotice(roomId.matrixRoomId, message);
  }

  /************************************************
   * syncSpace
   *************************************************/
  public async syncSpace(spaceId: RoomIdentifier | string) {
    if (!this.auth) {
      throw new Error("not authenticated");
    }
    return syncZionSpace(this.client, spaceId, this.auth.userId);
  }

  /************************************************
   * getPowerLevel
   ************************************************/
  public getPowerLevel(
    roomId: RoomIdentifier,
    key: string,
  ): PowerLevel | undefined {
    return this.getPowerLevels(roomId).levels.find(
      (x) => x.definition.key === key,
    );
  }
  /************************************************
   * getPowerLevels
   ************************************************/
  public getPowerLevels(roomId: RoomIdentifier): PowerLevels {
    const room = this.client.getRoom(roomId.matrixRoomId);
    if (!room) {
      throw new Error(`Room ${roomId.matrixRoomId} not found`);
    }
    const powerLevelsEvent = room.currentState.getStateEvents(
      EventType.RoomPowerLevels,
      "",
    );
    const powerLevels = powerLevelsEvent ? powerLevelsEvent.getContent() : {};
    return enrichPowerLevels(powerLevels);
  }

  /************************************************
   * setPowerLevel
   ************************************************/
  public async setPowerLevel(
    roomId: RoomIdentifier,
    key: string | PowerLevel,
    newValue: number,
  ) {
    const current =
      typeof key == "string" ? this.getPowerLevel(roomId, key) : key;
    if (!current) {
      throw new Error(`Power level ${key as string} not found`);
    }
    const response = await setZionPowerLevel(
      this.client,
      roomId,
      current,
      newValue,
    );
    this.log(
      `updted power level ${current.definition.key} for room[${roomId.matrixRoomId}] from ${current.value} to ${newValue}`,
      response,
    );
  }

  /************************************************
   * isRoomEncrypted
   ************************************************/
  public isRoomEncrypted(roomId: RoomIdentifier): boolean {
    return this.client.isRoomEncrypted(roomId.matrixRoomId);
  }

  /************************************************
   * getRoom
   ************************************************/
  public getRoom(roomId: RoomIdentifier | string): MatrixRoom | undefined {
    if (typeof roomId === "string") {
      return this.client.getRoom(roomId) ?? undefined;
    } else {
      return this.client.getRoom(roomId.matrixRoomId) ?? undefined;
    }
  }

  /************************************************
   * getRooms
   ************************************************/
  public getRooms(): MatrixRoom[] {
    return this.client.getRooms();
  }

  /************************************************
   * getUser
   ************************************************/
  public getUser(userId: string): User | null {
    return this.client.getUser(userId);
  }

  /************************************************
   * getProfileInfo
   ************************************************/
  public async getProfileInfo(
    userId: string,
  ): Promise<{ avatar_url?: string; displayname?: string }> {
    const info = await this.client.getProfileInfo(userId);
    const user = this.client.getUser(userId);
    if (user) {
      if (info.displayname) {
        user.setDisplayName(info.displayname);
        user.emit(UserEvent.DisplayName, user.events.presence, user);
      }
      if (info.avatar_url) {
        user.setAvatarUrl(info.avatar_url);
        user.emit(UserEvent.AvatarUrl, user.events.presence, user);
      }
    }
    return info;
  }

  /************************************************
   * getUserId
   ************************************************/
  public getUserId(): string | undefined {
    return this.auth?.userId;
  }
  /************************************************
   * setDisplayName
   ************************************************/
  public async setDisplayName(name: string): Promise<void> {
    await this.client.setDisplayName(name);
  }

  /************************************************
   * avatarUrl
   ************************************************/
  public async setAvatarUrl(url: string): Promise<void> {
    await this.client.setAvatarUrl(url);
  }

  /************************************************
   * scrollback
   ************************************************/
  public async scrollback(
    roomId: RoomIdentifier,
    limit?: number,
  ): Promise<void> {
    const room = this.client.getRoom(roomId.matrixRoomId);
    if (!room) {
      throw new Error("room not found");
    }
    await this.client.scrollback(room, limit);
  }

  /************************************************
   * send read receipt
   * no need to send for every message, matrix uses an "up to" algorithm
   ************************************************/
  public async sendReadReceipt(
    roomId: RoomIdentifier,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventId: string | undefined = undefined,
  ): Promise<void> {
    const room = this.client.getRoom(roomId.matrixRoomId);
    if (!room) {
      throw new Error(`room with id ${roomId.matrixRoomId} not found`);
    }
    const event = eventId
      ? room.findEventById(eventId)
      : room.getLiveTimeline().getEvents().at(-1);
    if (!event) {
      throw new Error(
        `event for room ${roomId.matrixRoomId} eventId: ${
          eventId ?? "at(-1)"
        } not found`,
      );
    }
    const result = await this.client.sendReadReceipt(event);
    this.log("read receipt sent", result);
  }

  /************************************************
   * on
   * Some matrix events are only emitted by the client,
   * not through the room object.
   ************************************************/
  public on(
    event:
      | ClientEvent.Sync
      | ClientEvent.Room
      | MatrixEventEvent.Decrypted
      | MatrixEventEvent.Replaced
      | MatrixEventEvent.VisibilityChange
      | RoomEvent.Receipt
      | RoomEvent.Timeline
      | RoomEvent.MyMembership
      | RoomEvent.Name,
    callback:
      | ((event: MatrixEvent) => void)
      | ((
          event: MatrixEvent,
          room: MatrixRoom,
          toStartOfTimeline: boolean,
          removed: boolean,
          data: IRoomTimelineData,
        ) => void)
      | ((
          state: SyncState,
          lastState?: SyncState,
          data?: ISyncStateData,
        ) => void)
      | ((room: MatrixRoom) => void),
  ) {
    this.client.on(event, callback);
  }
  /************************************************
   * removeListener
   * Some matrix events are only emitted by the client,
   * not through the room object.
   ************************************************/
  public removeListener(
    event:
      | ClientEvent.Sync
      | ClientEvent.Room
      | MatrixEventEvent.Decrypted
      | MatrixEventEvent.Replaced
      | MatrixEventEvent.VisibilityChange
      | RoomEvent.Receipt
      | RoomEvent.Timeline
      | RoomEvent.MyMembership
      | RoomEvent.Name,
    callback:
      | ((event: MatrixEvent) => void)
      | ((
          event: MatrixEvent,
          room: MatrixRoom,
          toStartOfTimeline: boolean,
          removed: boolean,
          data: IRoomTimelineData,
        ) => void)
      | ((
          state: SyncState,
          lastState?: SyncState,
          data?: ISyncStateData,
        ) => void)
      | ((room: MatrixRoom) => void),
  ) {
    this.client.removeListener(event, callback);
  }

  /************************************************
   * log
   *************************************************/
  protected log(message: string, ...optionalParams: unknown[]) {
    console.log(message, ...optionalParams);
  }

  /************************************************
   * createMatrixClient
   * helper, creates a matrix client with appropriate auth
   *************************************************/
  private static createMatrixClient(
    homeServerUrl: string,
    auth?: ZionAuth,
  ): { store: CustomMemoryStore; client: MatrixClient } {
    const store = new CustomMemoryStore({ localStorage: global.localStorage });
    if (auth) {
      return {
        store: store,
        client: createClient({
          store: store as IStore,
          baseUrl: homeServerUrl,
          accessToken: auth.accessToken,
          userId: auth.userId,
          deviceId: auth.deviceId,
          useAuthorizationHeader: true,
        }),
      };
    } else {
      return {
        store: store,
        client: createClient({
          store: store as IStore,
          baseUrl: homeServerUrl,
        }),
      };
    }
  }

  /************************************************
   * createMatrixClient
   * helper, creates a matrix client with appropriate auth
   *************************************************/
  private static createContracts(
    getProvider: () => ethers.providers.Provider | undefined,
    getSigner: () => ethers.Signer | undefined,
    chainId: number,
  ) {
    const addresses = getContractAddresses(chainId);
    console.log("ZionClient::creating contracts", { chainId, addresses });
    const spaceManager = new ZionContractProvider<ZionSpaceManager>(
      getProvider,
      getSigner,
      addresses.spaceManager.spacemanager,
      zionSpaceManagerAbi(),
    );
    const councilNFT = new ZionContractProvider<CouncilNFT>(
      getProvider,
      getSigner,
      addresses.council.councilnft,
      zionCouncilNFTAbi(),
    );

    return { spaceManager, councilNFT };
  }
}
