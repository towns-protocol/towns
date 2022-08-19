export interface CreateUserArgs {
  display_name: string;
  avatar_mxc?: string;
}

export type CreateUserFunction = (args: CreateUserArgs) => Promise<void>;

export type CreateRoomArgs = Record<string, unknown>;

export type CreateRoomFunction = (args: CreateRoomArgs) => Promise<void>;
