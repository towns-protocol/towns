/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Wallet } from "ethers";
import {
  ClientEvent,
  createClient,
  EventType,
  ICreateClientOpts,
  MatrixClient,
} from "matrix-js-sdk";
import {
  getChainIdEip155,
  LoginTypePublicKey,
  LoginTypePublicKeyEthereum,
  RegisterRequest,
} from "../../../src/hooks/login";
import {
  createMessageToSign,
  newRegisterSession,
} from "../../../src/hooks/use-matrix-wallet-sign-in";
import {
  createUserIdFromEthereumAddress,
  UserIdentifier,
} from "../../../src/types/user-identifier";
import { createZionChannel } from "../../../src/hooks/MatrixClient/useCreateChannel";
import { inviteZionUser } from "../../../src/hooks/MatrixClient/useInviteUser";
import { joinZionRoom } from "../../../src/hooks/MatrixClient/useJoinRoom";
import { sendZionMessage } from "../../../src/hooks/MatrixClient/useSendMessage";
import { setZionPowerLevel } from "../../../src/hooks/MatrixClient/useSetPowerLevel";
import { enrichPowerLevels } from "../../../src/hooks/use-power-levels";
import {
  CreateChannelInfo,
  CreateSpaceInfo,
  PowerLevel,
  PowerLevels,
  RoomIdentifier,
  SendMessageOptions,
} from "../../../src/types/matrix-types";
import { sleepUntil } from "./TestUtils";
import { createZionSpace } from "../../../src/hooks/MatrixClient/useCreateSpace";
import { syncZionSpace } from "../../../src/hooks/MatrixClient/useSyncSpace";

export class MatrixTestClient {
  static allClients: MatrixTestClient[] = [];
  static async cleanup() {
    console.log("========= MatrixTestClient: cleanup =========");
    await Promise.all(this.allClients.map((client) => client.stopClient()));
    this.allClients = [];
    console.log("========= MatrixTestClient: cleanup done =========");
  }

  public name: string;
  public client: MatrixClient;
  public wallet: Wallet;
  public userIdentifier: UserIdentifier;
  public homeServer: string;
  public chainId: string;
  public disableEncryption: boolean;
  public initialSyncLimit = 20;
  public matrixUserId?: string;
  private matrixAccessToken?: string;
  private matrixDeviceId?: string;

  constructor(name: string) {
    // init state
    this.name = name;
    this.chainId = process.env.CHAIN_ID!;
    this.homeServer = process.env.HOMESERVER!;
    this.disableEncryption = process.env.DISABLE_ENCRYPTION === "true";
    // create an initial client, this won't have an auth token
    this.client = createClient({
      baseUrl: this.homeServer,
    });
    // create a random wallet, we're web3!
    this.wallet = Wallet.createRandom();
    // construct a user identifier for later
    this.userIdentifier = createUserIdFromEthereumAddress(
      this.wallet.address,
      getChainIdEip155(this.chainId),
    );
    this.log("new client");
    MatrixTestClient.allClients.push(this);
  }

  /// log a message to the console with the user's name and part of the wallet address
  private log(message: string, ...optionalParams: unknown[]) {
    console.log(
      `${this.name}(${this.userIdentifier.accountAddress.substring(0, 5)}...)`,
      message,
      ...optionalParams,
    );
  }

  // check if something eventually becomes true
  public async eventually(
    condition: (client: MatrixTestClient) => boolean | undefined,
    timeout = 2000,
    checkEvery = 100,
  ): Promise<boolean> {
    return sleepUntil(this, condition, timeout, checkEvery);
  }

  /// register this users wallet with the matrix server
  public async registerWallet() {
    // set up some hacky origin varible, no idea how the other code gets this
    const origin = this.homeServer;

    // create a registration request, this reaches out to our server and sets up a session
    // and passes back info on about the server
    const { sessionId, chainIds, nonce, error } = await newRegisterSession(
      this.client,
      this.wallet.address,
    );

    // hopefully we didn't get an error
    if (error) {
      throw error;
    }

    // make sure the server supports our chainId
    if (!chainIds.find((x) => x == getChainIdEip155(this.chainId))) {
      throw new Error(`ChainId ${this.chainId} not found`);
    }

    const messageToSign = createMessageToSign({
      walletAddress: this.userIdentifier.accountAddress,
      chainId: this.userIdentifier.chainId,
      homeServer: this.homeServer,
      origin,
      nonce: nonce,
      statement: "this is a test registration",
    });

    const signature = await this.wallet.signMessage(messageToSign);

    const request: RegisterRequest = {
      auth: {
        type: LoginTypePublicKey,
        session: sessionId,
        public_key_response: {
          type: LoginTypePublicKeyEthereum,
          session: sessionId,
          message: messageToSign,
          signature,
          user_id: this.userIdentifier.matrixUserIdLocalpart,
        },
      },
      username: this.userIdentifier.matrixUserIdLocalpart,
    };

    // register the user
    const { access_token, device_id, user_id } =
      await this.client.registerRequest(request, LoginTypePublicKey);

    this.matrixAccessToken = access_token;
    this.matrixDeviceId = device_id;
    this.matrixUserId = user_id;

    this.log(
      "registered, matrixUserIdLocalpart: ",
      this.userIdentifier.matrixUserIdLocalpart,
      "userId: ",
      user_id,
    );
  }

  /// start a message client, will register the wallet if it's not already registered
  public async startClient() {
    if (!this.matrixAccessToken || !this.matrixUserId) {
      throw new Error("Client not registered");
    }
    const options: ICreateClientOpts = {
      baseUrl: this.homeServer,
      accessToken: this.matrixAccessToken,
      userId: this.matrixUserId,
      deviceId: this.matrixDeviceId,
    };

    // abandon the previous client
    this.client.stopClient();
    // create a new one, with the new access token
    this.client = createClient(options);
    // start it up, this begins a sync command
    if (!this.disableEncryption) {
      await this.client.initCrypto();
      // disable log?
      this.client.setGlobalErrorOnUnknownDevices(false);
    }
    // start client
    await this.client.startClient({ initialSyncLimit: this.initialSyncLimit });
    // wait for the sync to complete
    const sunk = new Promise<string>((resolve, reject) => {
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

    await sunk;
  }

  public async registerWalletAndStartClient() {
    if (!this.matrixAccessToken || !this.matrixUserId) {
      await this.registerWallet();
    }
    return this.startClient();
  }

  /// stop the matrix client
  public stopClient() {
    this.log("stopping client");
    this.client.stopClient();
  }

  /// create a room and return the roomId
  public async createChannel(
    createInfo: CreateChannelInfo,
  ): Promise<RoomIdentifier> {
    return createZionChannel({
      matrixClient: this.client,
      homeServer: this.homeServer,
      createInfo: createInfo,
      disableEncryption: this.disableEncryption,
    });
  }

  /// create a space and return the roomId
  public async createSpace(
    createSpaceInfo: CreateSpaceInfo,
  ): Promise<RoomIdentifier> {
    return createZionSpace({
      matrixClient: this.client,
      createSpaceInfo,
      disableEncryption: this.disableEncryption,
    });
  }

  /// invite a user to your room
  public async inviteUser(userId: string, roomId: RoomIdentifier) {
    return inviteZionUser({ matrixClient: this.client, userId, roomId });
  }

  /// join room
  public async joinRoom(roomId: RoomIdentifier) {
    return await joinZionRoom({ matrixClient: this.client, roomId });
  }

  /// send a message to a room
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

  public async syncSpace(spaceId: RoomIdentifier) {
    return syncZionSpace(
      this.client,
      spaceId,
      this.userIdentifier.matrixUserId!,
    );
  }

  /// set the room invite level
  public async setRoomInviteLevel(roomId: RoomIdentifier, level: number) {
    const current = (await this.getPowerLevels(roomId)).levels.find(
      (x) => x.definition.key == "invite",
    );
    if (!current) {
      throw new Error("invite level not found");
    }
    const response = await setZionPowerLevel(
      this.client,
      roomId,
      current,
      level,
    );
    console.log("setRoomInviteLevel", response);
  }

  /// set any power level
  public async setPowerLevel(
    roomId: RoomIdentifier,
    key: string,
    newValue: number,
  ) {
    const current = this.getPowerLevel(roomId, key);
    return await setZionPowerLevel(this.client, roomId, current, newValue);
  }

  /// get the power levels for a room
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

  /// get a specific power level for a room
  public getPowerLevel(roomId: RoomIdentifier, key: string): PowerLevel {
    return this.getPowerLevels(roomId).levels.find(
      (x) => x.definition.key === key,
    )!;
  }
}
