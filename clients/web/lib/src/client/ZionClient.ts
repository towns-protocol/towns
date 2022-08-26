import {
  ClientEvent,
  EventType,
  MatrixClient,
  MatrixEvent,
  MatrixEventEvent,
  PendingEventOrdering,
  Room as MatrixRoom,
  RoomEvent,
  RoomMemberEvent,
  User,
  UserEvent,
} from "matrix-js-sdk";
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
import { StartClientOpts, ZionAuth, ZionOpts } from "./ZionClientTypes";

import { BigNumberish } from "ethers";
import { ZionContractProvider } from "./web3/ZionContractProvider";
import { createMatrixClient } from "./matrix/CreateClient";
import { createZionChannel } from "./matrix/CreateChannel";
import { createZionSpace } from "./matrix/CreateSpace";
import { enrichPowerLevels } from "./matrix/PowerLevels";
import { inviteZionUser } from "./matrix/InviteUser";
import { joinZionRoom } from "./matrix/Join";
import { sendZionMessage } from "./matrix/SendMessage";
import { setZionPowerLevel } from "./matrix/SetPowerLevels";
import { syncZionSpace } from "./matrix/SyncSpace";
import { editZionMessage } from "./matrix/EditMessage";
import {
  ZionSpaceManager,
  CouncilNFT,
  CouncilStaking,
} from "@harmony/contracts/governance";
import {
  zionCouncilNFTAbi,
  zionSpaceManagerAbi,
  zionCouncilStakingAbi,
} from "./web3/ZionAbis";

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
  public get auth(): ZionAuth | undefined {
    return this._auth;
  }
  public spaceManager: ZionContractProvider<ZionSpaceManager>;
  public councilNFT: ZionContractProvider<CouncilNFT>;
  public councilStaking: ZionContractProvider<CouncilStaking>;
  private _auth?: ZionAuth;

  private client: MatrixClient;

  constructor(opts: ZionOpts, name?: string) {
    this.opts = opts;
    this.name = name || "";
    console.log("~~~ new ZionClient ~~~", this.name, this.opts);
    this.client = createMatrixClient(opts, this._auth);
    this.spaceManager = new ZionContractProvider<ZionSpaceManager>(
      opts.getProvider,
      opts.getSigner,
      opts.spaceManagerAddress,
      zionSpaceManagerAbi(),
    );
    this.councilNFT = new ZionContractProvider<CouncilNFT>(
      opts.getProvider,
      opts.getSigner,
      opts.councilNFTAddress,
      zionCouncilNFTAbi(),
    );
    this.councilStaking = new ZionContractProvider<CouncilStaking>(
      opts.getProvider,
      opts.getSigner,
      opts.councilStakingAddress,
      zionCouncilStakingAbi(),
    );
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
    this.client = createMatrixClient(this.opts, this.auth);
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
  public async startClient(auth: ZionAuth, startOpts?: StartClientOpts) {
    if (this.auth) {
      throw new Error("already authenticated");
    }
    if (this.client.clientRunning) {
      throw new Error("client already running");
    }
    // stop everything
    this.stopClient();
    // log,
    this.log("Starting client", startOpts);
    // set auth
    this._auth = auth;
    // helpful logs
    this.log(`startClient`);
    // new client
    this.client = createMatrixClient(this.opts, this.auth);
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
        (state: unknown, prevState: unknown, res: unknown) => {
          if (state === "PREPARED") {
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
   * getSpaces
   *************************************************/
  public async getSpaces() {
    console.log("ZionClient::get spaces");
    return this.spaceManager.unsigned.getSpaceNames();
  }

  /************************************************
   * getSpace
   *************************************************/
  public async getSpace(spaceId: BigNumberish) {
    return this.spaceManager.unsigned.getSpaceValues(spaceId);
  }

  /************************************************
   * createSpace
   *************************************************/
  public async createWeb3Space(createSpaceInfo: CreateSpaceInfo) {
    return this.spaceManager.signed.createSpace(createSpaceInfo.name, [
      this.opts.userModuleAddress,
    ]);
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
  public async syncSpace(spaceId: RoomIdentifier) {
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
  public getRoom(roomId: RoomIdentifier): MatrixRoom | null {
    return this.client.getRoom(roomId.matrixRoomId);
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
   * log
   *************************************************/
  protected log(message: string, ...optionalParams: unknown[]) {
    console.log(message, ...optionalParams);
  }
}
