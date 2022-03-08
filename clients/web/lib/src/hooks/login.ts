import { createClient } from "matrix-js-sdk";

export enum LogInStatus {
  LoggedIn = "LoggedIn",
  LoggingIn = "LoggingIn",
  LoggingOut = "LoggingOut",
  LoggedOut = "LoggedOut",
}

interface LoginResult {
  accessToken: string | undefined;
  userId: string | undefined;
  homeServer: string | undefined;
  deviceId: string | undefined;
  error?: string;
}

export function getUserNamePart(
  userId: string | undefined
): string | undefined {
  if (userId) {
    const regexName = /^@(?<name>\w+):/;
    const match = regexName.exec(userId);
    const username = match?.groups?.name ?? undefined;
    return username;
  }

  return undefined;
}

export async function matrixRegisterUser(
  homeServerUrl: string,
  username: string,
  password: string
): Promise<LoginResult> {
  let error: string | undefined;
  try {
    const newClient = createClient(homeServerUrl);
    const response = await newClient.register(username, password, undefined, {
      type: "m.login.dummy",
      //type: "m.login.password",
    });
    //console.log(`response:`, JSON.stringify(response));
    return {
      accessToken: response.access_token,
      deviceId: response.device_id,
      homeServer: response.home_server,
      userId: response.user_id,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    error = ex.message;
    console.error(`Error creating new user:`, ex.stack);
  }

  return {
    accessToken: undefined,
    deviceId: undefined,
    homeServer: undefined,
    userId: undefined,
    error,
  };
}

export async function matrixLoginWithPassword(
  homeServerUrl: string,
  username: string,
  password: string
): Promise<LoginResult> {
  let error: string | undefined;
  try {
    const newClient = createClient(homeServerUrl);
    const response = await newClient.loginWithPassword(username, password);
    //console.log(`response:`, JSON.stringify(response));
    return {
      accessToken: response.access_token,
      deviceId: response.device_id,
      homeServer: response.home_server,
      userId: response.user_id,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    error = ex.message;
    console.error(`Error logging in:`, ex.stack);
  }

  return {
    accessToken: undefined,
    deviceId: undefined,
    homeServer: undefined,
    userId: undefined,
    error,
  };
}
