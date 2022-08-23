import {
  Appservice,
  Intent,
  LogService,
  MembershipEvent,
} from "matrix-bot-sdk";
import { CreateRoomFunction, CreateUserFunction } from "./appservice-types";

import { IConfig } from "./IConfig";
import { M_UNAUTHORIZED_ACCESS } from "./global-const";
import { WeakEvent } from "matrix-appservice-bridge";
import { createUserIdFromString } from "./UserIdentifier";
import { ethers } from "ethers";

const PRINT_TAG = "[ZionBotController]";

interface Web3Providers {
  [networkId: number]: ethers.providers.Provider;
}

// TODO: Read from the Space contract
interface SpaceSetting {
  matrixRoomId: string;
  isTokenRequired: boolean;
}

interface SpaceSettings {
  [matrixRoomId: string]: SpaceSetting;
}

export class ZionBotController {
  private appservice: Appservice;
  private config: IConfig;
  private web3Providers: Web3Providers;
  private spaceSettings: SpaceSettings;

  constructor(appservice: Appservice, config: IConfig) {
    this.appservice = appservice;
    this.config = config;
    this.web3Providers = {};
    this.spaceSettings = {};

    appservice.on("room.event", (roomId, event) =>
      this.onRoomEvent(roomId, event)
    );
    appservice.on("room.message", (roomId, event) =>
      this.onRoomMessage(roomId, event)
    );
    appservice.on("query.user", (userId, createUser) =>
      this.onQueryUser(userId, createUser)
    );
    appservice.on("query.room", (roomAlias, createRoom) =>
      this.onQueryRoom(roomAlias, createRoom)
    );
    appservice.on("room.invite", (roomId, event) =>
      this.onRoomInvite(roomId, event)
    );
    appservice.on("room.join", (roomId, event) =>
      this.onRoomJoin(roomId, event)
    );
    appservice.on("room.leave", (roomId, event) =>
      this.onRoomLeave(roomId, event)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async onRoomEvent(roomId: string, event: WeakEvent): Promise<void> {
    LogService.info(`${PRINT_TAG} onRoomEvent`, event);
  }

  public async onRoomMessage(roomId: string, event: WeakEvent): Promise<void> {
    if (!event["content"]) {
      return;
    }

    const msgType = event["content"]["msgtype"];
    switch (msgType) {
      case "m.notice":
        await this.onReceiveNotice(roomId, event);
        break;
      case "m.text":
        this.onReceiveTextMessage(roomId, event);
        break;
      default:
        break;
    }
  }

  public async onQueryUser(
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createUser: CreateUserFunction
  ): Promise<void> {
    // This is called when the homeserver queries a user's existence. At this point, a
    // user should be created. To do that, give an object or Promise of an object in the
    // form below to the createUser function (as shown). To prevent the creation of a user,
    // pass false to createUser, like so: createUser(false);
    LogService.info(PRINT_TAG, `Received query for user ${userId}`);
    if (userId === this.appservice.botUserId) {
      await createUser({
        display_name: "zionbot",
      });
    }
  }

  public async onQueryRoom(
    roomAlias: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createRoom: CreateRoomFunction
  ): Promise<void> {
    // This is called when the homeserver queries to find out if a room alias exists. At
    // this point, a room should be created and associated with the room alias. To do
    // that, given an object or Promise of an object in the form below to the createRoom
    // function (as shown). To prevent creation of a room, pass false to createRoom like
    // so: createRoom(false); The object (with minor modifications) will be passed to
    // the /createRoom API.
    LogService.info(PRINT_TAG, `Received query for alias ${roomAlias}`);
    /*
    await createRoom({
      name: "Hello World",
      topic: "This is an example room",
      invite: [this.appservice.botUserId],
      visibility: "public",
      preset: "public_chat",
    });
    */
  }

  public async onRoomInvite(roomId: string, event: WeakEvent): Promise<void> {
    LogService.info(
      PRINT_TAG,
      `Received invite for ${event["state_key"]} to ${roomId}`
    );
    if (event.state_key === this.appservice.botUserId) {
      const isBotInRoom = await this.isBotInRoom(roomId);
      if (!isBotInRoom) {
        await this.appservice.botIntent.joinRoom(roomId);
      }
    }
  }

  public async onRoomJoin(roomId: string, event: WeakEvent): Promise<void> {
    LogService.info(PRINT_TAG, `Joined ${roomId} as ${event["state_key"]}`);
    const stateKey = event.state_key;
    if (stateKey) {
      try {
        const isAdminUser = await this.isAdmin(roomId, stateKey);
        if (isAdminUser) {
          // As the admin, invite the bot to the space / room.
          await this.inviteBotToRoom({ roomId, adminId: stateKey });
        } else if (stateKey === event.sender) {
          const isAccessAllowed = await this.isAccessAllowed({
            roomId,
            userId: stateKey,
          });
          if (!isAccessAllowed) {
            await this.banUser({ roomId, userId: stateKey });
          } else {
            const membershipEvent = await this.getMembershipEvent({
              roomId,
              userId: stateKey,
            });
            await this.unbanUser({
              roomId,
              userId: stateKey,
              membershipEvent,
            });
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        LogService.error(`${PRINT_TAG}`, e);
      }
    }
  }

  public onRoomLeave(roomId: string, event: WeakEvent): void {
    LogService.info(PRINT_TAG, `Left ${roomId} as ${event["state_key"]}`);
  }

  private getWeb3Provider(
    networkId: number
  ): ethers.providers.Provider | undefined {
    let provider = this.web3Providers[networkId];

    if (!provider) {
      switch (networkId) {
        case 1337: {
          provider = new ethers.providers.JsonRpcProvider(
            "http://localhost:8545"
          );
          break;
        }
        default: {
          provider = new ethers.providers.InfuraProvider(
            networkId,
            this.config.web3ProviderKey
          );
          break;
        }
      }
      if (provider) {
        this.web3Providers[networkId] = provider;
      }
    }
    return provider;
  }

  private async isAdmin(roomId: string, userId?: string): Promise<boolean> {
    if (userId) {
      const intent = this.appservice.getIntentForUserId(userId);
      const roomCreator = await this.getRoomCreator(intent, roomId);
      return userId === roomCreator;
    }
    return false;
  }

  private async getRoomCreator(
    intent: Intent,
    roomId: string
  ): Promise<string | undefined> {
    const roomEvents = await intent.underlyingClient.getRoomState(roomId);
    for (let i = 0; i < roomEvents.length; i++) {
      const e = roomEvents[i] as WeakEvent;
      if (e.type === "m.room.create") {
        return e.sender;
      }
    }
    return undefined;
  }

  private async isBotInRoom(roomId: string): Promise<boolean> {
    const intent = this.appservice.botIntent;
    const joinedRooms = await intent.getJoinedRooms();
    return joinedRooms.includes(roomId);
  }

  private async inviteBotToRoom(args: {
    adminId: string;
    roomId: string;
  }): Promise<void> {
    if (!(await this.isBotInRoom(args.roomId))) {
      const intent = this.appservice.getIntentForUserId(args.adminId);
      await intent.underlyingClient.inviteUser(
        this.appservice.botUserId,
        args.roomId
      );
      await intent.underlyingClient.setUserPowerLevel(
        this.appservice.botUserId,
        args.roomId,
        51
      );
    }
  }

  private async enforceAccess(roomId: string): Promise<void> {
    try {
      const members = await this.getRoomMembers(roomId);
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const isAccessAllowed = await this.isAccessAllowed({
          roomId,
          userId: m.stateKey,
        });
        if (isAccessAllowed) {
          await this.unbanUser({
            roomId,
            userId: m.stateKey,
            membershipEvent: m,
          });
        } else {
          if (m.membership === "join" || m.membership === "invite") {
            // Kick out users who don't have access.
            LogService.info(
              `Access denied. Ban user ${m.stateKey}, membership: ${m.content.membership}`
            );
            await this.banUser({ roomId, userId: m.stateKey });
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      LogService.error(`${PRINT_TAG}`, e);
    }
  }

  private async onReceiveNotice(
    roomId: string,
    event: WeakEvent
  ): Promise<void> {
    const isAdmin = await this.isAdmin(roomId, event.sender);
    if (isAdmin) {
      const body = event["content"]["body"];
      switch (body) {
        case "/require_token": {
          this.spaceSettings[roomId] = {
            matrixRoomId: roomId,
            isTokenRequired: true,
          };
          await this.enforceAccess(roomId);
          break;
        }
        case "/require_none": {
          this.spaceSettings[roomId] = {
            matrixRoomId: roomId,
            isTokenRequired: false,
          };
          await this.enforceAccess(roomId);
          break;
        }
        default:
          break;
      }
    }
  }

  private onReceiveTextMessage(roomId: string, event: WeakEvent): void {
    const body = event["content"]["body"];
    LogService.info(
      PRINT_TAG,
      `Received message ${event["event_id"]} from ${event["sender"]} in ${roomId}: ${body}`
    );
  }

  private async isAccessAllowed(args: {
    roomId: string;
    userId: string;
  }): Promise<boolean> {
    const roomCreator = await this.getRoomCreator(
      this.appservice.botIntent,
      args.roomId
    );
    if (
      args.userId === this.appservice.botUserId ||
      args.userId === roomCreator // TODO: Remove this when space contract integration is done.
    ) {
      return true;
    }

    const isTokenRequired = this.spaceSettings[args.roomId]?.isTokenRequired === true;
    if (isTokenRequired) {
      const id = createUserIdFromString(args.userId);
      if (id) {
        const provider = this.getWeb3Provider(id.chainId);
        if (provider) {
          const balance = await provider.getBalance(id.accountAddress);
          return balance.gt(0);
        }
      }
    }

    // No token requirement.
    return !isTokenRequired;
  }

  private async banUser(args: {
    roomId: string;
    userId: string;
  }): Promise<void> {
    await this.appservice.botIntent.underlyingClient.banUser(
      args.userId,
      args.roomId,
      M_UNAUTHORIZED_ACCESS
    );
  }

  private async unbanUser(args: {
    roomId: string;
    userId: string;
    membershipEvent?: MembershipEvent;
  }): Promise<void> {
    if (args.membershipEvent?.membership === "ban") {
      if (args.membershipEvent.raw.content.reason === M_UNAUTHORIZED_ACCESS) {
        await this.appservice.botIntent.underlyingClient.unbanUser(
          args.userId,
          args.roomId
        );
      }
    }
  }

  private async getRoomMembers(roomId: string): Promise<MembershipEvent[]> {
    return await this.appservice.botIntent.underlyingClient.getRoomMembers(
      roomId,
      undefined
    );
  }

  private async getMembershipEvent(args: {
    roomId: string;
    userId: string;
  }): Promise<MembershipEvent | undefined> {
    const allMembers = await this.getRoomMembers(args.roomId);

    for (let i = 0; i < allMembers.length; i++) {
      const m = allMembers[i];
      if (m.stateKey === args.userId) {
        return m;
      }
    }

    return undefined;
  }
}
