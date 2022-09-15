/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ZionClient } from "../../../src/client/ZionClient";
import {
  LoginTypePublicKey,
  LoginTypePublicKeyEthereum,
  RegisterRequest,
} from "../../../src/hooks/login";
import { createMessageToSign } from "../../../src/hooks/use-matrix-wallet-sign-in";
import { createUserIdFromEthereumAddress } from "../../../src/types/user-identifier";
import { RoomIdentifier } from "../../../src/types/matrix-types";
import { ZionTestWeb3Provider } from "./ZionTestWeb3Provider";
import { makeUniqueName } from "./TestUtils";
import { ethers } from "ethers";

export class ZionTestClient extends ZionClient {
  static allClients: ZionTestClient[] = [];
  static async cleanup() {
    console.log(
      "========= ZionTestClient: cleanup =========",
      this.allClients.map((x) => x.getLoggingIdentifier()),
    );
    await Promise.all(this.allClients.map((client) => client.stopClient()));
    this.allClients = [];
    console.log("========= ZionTestClient: cleanup done =========");
  }

  public provider: ZionTestWeb3Provider;
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
        spaceManagerAddress: process.env.SPACE_MANAGER_ADDRESS!,
        councilNFTAddress: process.env.COUNCIL_NFT_ADDRESS!,
        councilStakingAddress: process.env.COUNCIL_STAKING_ADDRESS!,
        getSigner: () => this.provider.wallet,
        getProvider: () => {
          return this.provider;
        },
      },
      name,
    );
    // initialize our provider that wraps our wallet and chain communication
    this.provider = new ZionTestWeb3Provider();
    // add ourselves to the list of all clients
    ZionTestClient.allClients.push(this);
  }

  /// log a message to the console with the user's name and part of the wallet address
  protected log(message: string, ...optionalParams: unknown[]) {
    console.log(`${this.getLoggingIdentifier()}`, message, ...optionalParams);
  }

  /// return name formatted with readable segment of user id and device id
  public getLoggingIdentifier(): string {
    const accountAddress = ethers.utils.getAddress(
      this.provider.wallet.address,
    );
    const dx = 6;
    const addressLength = accountAddress.length;
    const pre = accountAddress.substring(0, dx);
    const post = accountAddress.substring(addressLength - dx);
    return `${this.name}${pre}_${post}@${this.auth?.deviceId ?? "unset"}`;
  }

  /// return a unique name sutable for a space or channel name
  public makeUniqueName(): string {
    return makeUniqueName(this.name);
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

    const network = await this.provider.getNetwork();
    const chainId = network.chainId;

    const userIdentifier = createUserIdFromEthereumAddress(
      this.provider.wallet.address,
      chainId,
    );

    // make sure the server supports our chainId
    if (!chainIds.find((x) => x == chainId)) {
      throw new Error(`ChainId ${chainId} not found`);
    }

    const messageToSign = createMessageToSign({
      walletAddress: userIdentifier.accountAddress,
      chainId: userIdentifier.chainId,
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
          user_id: userIdentifier.matrixUserIdLocalpart,
        },
      },
      username: userIdentifier.matrixUserIdLocalpart,
    };

    // register the user
    const auth = await this.register(request);

    this.log(
      "registered, matrixUserIdLocalpart: ",
      userIdentifier.matrixUserIdLocalpart,
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
