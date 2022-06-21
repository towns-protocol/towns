import { Wallet } from "ethers";
import {
  ClientEvent,
  createClient,
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
import { createZionRoom } from "../../../src/hooks/MatrixClient/useCreateRoom";
import { inviteZionUser } from "../../../src/hooks/MatrixClient/useInviteUser";
import { joinZionRoom } from "../../../src/hooks/MatrixClient/useJoinRoom";
import { sendZionMessage } from "../../../src/hooks/MatrixClient/useSendMessage";
import { CreateRoomInfo } from "../../../src/types/matrix-types";
import { sleepUntil } from "./TestUtils";

export class MatrixTestClient {
  public name: string;
  public client: MatrixClient;
  public wallet: Wallet;
  public userIdentifier: UserIdentifier;
  public homeServer: string;
  public chainId = "0x4"; // rinkby
  public initialSyncLimit = 20;
  public matrixUserId?: string;
  private matrixAccessToken?: string;
  private matrixDeviceId?: string;

  constructor(name: string, homeServer: string) {
    this.name = name;
    this.homeServer = homeServer;
    // create an initial client, this won't have an auth token
    this.client = new MatrixClient({
      baseUrl: homeServer,
      request: require("request"),
    });
    // create a random wallet, we're web3!
    this.wallet = Wallet.createRandom();
    // construct a user identifier for later
    this.userIdentifier = createUserIdFromEthereumAddress(
      this.wallet.address,
      getChainIdEip155(this.chainId),
    );
    this.log("new client");
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
    condition: (client: MatrixTestClient) => boolean,
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
      await this.registerWallet();
    }
    const options: ICreateClientOpts = {
      baseUrl: this.homeServer,
      accessToken: this.matrixAccessToken,
      userId: this.matrixUserId,
      deviceId: this.matrixDeviceId,
      request: require("request"),
    };

    // abandon the previous client
    this.client.stopClient();
    // create a new one, with the new access token
    this.client = createClient(options);
    // start it up, this begins a sync command
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

  /// stop the matrix client
  public stopClient() {
    this.log("stopping client");
    this.client.stopClient();
  }

  /// create a room and return the roomId
  public async createRoom(createInfo: CreateRoomInfo): Promise<string> {
    return createZionRoom({
      matrixClient: this.client,
      homeServer: this.homeServer,
      createInfo: createInfo,
    });
  }

  /// invite a user to your room
  public async inviteUser(userId: string, roomId: string) {
    return inviteZionUser({ matrixClient: this.client, userId, roomId });
  }

  /// join room
  public async joinRoom(roomId: string) {
    return await joinZionRoom({ matrixClient: this.client, roomId });
  }

  /// send a message to a room
  public async sendMessage(roomId: string, message: string) {
    return await sendZionMessage({
      matrixClient: this.client,
      roomId,
      message,
    });
  }
}
