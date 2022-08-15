/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
import { ZionTestWeb3Provider } from "./ZionTestWeb3Provider";

export class ZionTestClient extends ZionClient {
  static allClients: ZionTestClient[] = [];
  static async cleanup() {
    console.log("========= ZionTestClient: cleanup =========");
    await Promise.all(this.allClients.map((client) => client.stopClient()));
    this.allClients = [];
    console.log("========= ZionTestClient: cleanup done =========");
  }

  public provider: ZionTestWeb3Provider;
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
        getSigner: () => this.provider.wallet,
        getProvider: () => {
          return this.provider;
        },
      },
      name,
    );
    // initialize our provider that wraps our wallet and chain communication
    this.provider = new ZionTestWeb3Provider();
    // construct a user identifier for later
    this.userIdentifier = createUserIdFromEthereumAddress(
      this.provider.wallet.address,
      getChainIdEip155(this.provider.chainId),
    );
    // add ourselves to the list of all clients
    ZionTestClient.allClients.push(this);
  }

  /// log a message to the console with the user's name and part of the wallet address
  protected log(message: string, ...optionalParams: unknown[]) {
    console.log(`${this.getUniqueName()}`, message, ...optionalParams);
  }

  public getUniqueName(): string {
    const dx = 6;
    const addressLength = this.userIdentifier.accountAddress.length;
    const pre = this.userIdentifier.accountAddress.substring(0, dx);
    const post = this.userIdentifier.accountAddress.substring(
      addressLength - dx,
    );
    return `${this.name}${pre}_${post}`;
  }

  // check if something eventually becomes true
  public async eventually(
    condition: (client: ZionTestClient) => boolean | undefined,
    timeout = 2000,
    checkEvery = 100,
  ): Promise<boolean> {
    return sleepUntil(this, condition, timeout, checkEvery);
  }

  /// add some funds to this wallet
  public async fundWallet(amount = 0.1) {
    const result = await this.provider.fundWallet(amount);
    this.log("funded wallet: ", result.hash);
    return result;
  }

  /// register this users wallet with the matrix server
  /// a.ellis, would be nice if this used the same code as the web client
  public async registerWallet() {
    // set up some hacky origin varible, no idea how the other code gets this
    const origin = this.opts.homeServerUrl;

    // create a registration request, this reaches out to our server and sets up a session
    // and passes back info on about the server
    const { sessionId, chainIds, error } = await this.preRegister(
      this.provider.wallet.address,
    );

    // hopefully we didn't get an error
    if (error) {
      throw error;
    }

    // make sure the server supports our chainId
    if (!chainIds.find((x) => x == getChainIdEip155(this.provider.chainId))) {
      throw new Error(`ChainId ${this.provider.chainId} not found`);
    }

    const messageToSign = createMessageToSign({
      walletAddress: this.userIdentifier.accountAddress,
      chainId: this.userIdentifier.chainId,
      homeServer: this.opts.homeServerUrl,
      origin,
      statement: "this is a test registration",
    });

    const signature = await this.provider.wallet.signMessage(messageToSign);

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
