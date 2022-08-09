/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Wallet } from "ethers";
import { ZionClient } from "../../../src/client/ZionClient";
import {
  getChainIdEip155,
  LoginTypePublicKey,
  LoginTypePublicKeyEthereum,
  RegisterRequest,
} from "../../../src/hooks/login";
import { createMessageToSign } from "../../../src/hooks/use-matrix-wallet-sign-in";
import {
  createUserIdFromEthereumAddress,
  UserIdentifier,
} from "../../../src/types/user-identifier";
import { RoomIdentifier } from "../../../src/types/matrix-types";
import { sleepUntil } from "../../../src/utils/zion-utils";

export class ZionTestClient extends ZionClient {
  static allClients: ZionTestClient[] = [];
  static async cleanup() {
    console.log("========= ZionTestClient: cleanup =========");
    await Promise.all(this.allClients.map((client) => client.stopClient()));
    this.allClients = [];
    console.log("========= ZionTestClient: cleanup done =========");
  }

  public wallet: Wallet;
  public chainId: string;
  public userIdentifier: UserIdentifier;
  public get matrixUserId(): string | undefined {
    return this.auth?.userId;
  }

  constructor(name: string) {
    // super
    super(
      {
        homeServerUrl: process.env.HOMESERVER!,
        initialSyncLimit: 20,
        disableEncryption: process.env.DISABLE_ENCRYPTION === "true",
      },
      name,
    );
    // init state
    this.chainId = process.env.CHAIN_ID!;
    // create a random wallet, we're web3!
    this.wallet = Wallet.createRandom();
    // construct a user identifier for later
    this.userIdentifier = createUserIdFromEthereumAddress(
      this.wallet.address,
      getChainIdEip155(this.chainId),
    );
    ZionTestClient.allClients.push(this);
  }

  /// log a message to the console with the user's name and part of the wallet address
  protected log(message: string, ...optionalParams: unknown[]) {
    console.log(
      `${this.name}(${this.userIdentifier.accountAddress.substring(0, 5)}...)`,
      message,
      ...optionalParams,
    );
  }

  // check if something eventually becomes true
  public async eventually(
    condition: (client: ZionTestClient) => boolean | undefined,
    timeout = 2000,
    checkEvery = 100,
  ): Promise<boolean> {
    return sleepUntil(this, condition, timeout, checkEvery);
  }

  /// register this users wallet with the matrix server
  /// a.ellis, would be nice if this used the same code as the web client
  public async registerWallet() {
    // set up some hacky origin varible, no idea how the other code gets this
    const origin = this.opts.homeServerUrl;

    // create a registration request, this reaches out to our server and sets up a session
    // and passes back info on about the server
    const { sessionId, chainIds, error } = await this.preRegister(
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
      homeServer: this.opts.homeServerUrl,
      origin,
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
    const auth = await this.register(request);

    this.log(
      "registered, matrixUserIdLocalpart: ",
      this.userIdentifier.matrixUserIdLocalpart,
      "userId: ",
      auth.userId,
    );
    return auth;
  }

  /// helper function to get a test client up and running
  public async registerWalletAndStartClient() {
    let myAuth = this.auth;
    if (!myAuth) {
      myAuth = await this.registerWallet();
    }
    return this.startClient(myAuth);
  }

  /// set the room invite level
  public async setRoomInviteLevel(roomId: RoomIdentifier, level: number) {
    const response = await this.setPowerLevel(roomId, "invite", level);
    console.log("setRoomInviteLevel", response);
  }
}
