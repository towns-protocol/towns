export enum LoginStatus {
  LoggedIn = "LoggedIn",
  LoggingIn = "LoggingIn",
  LoggingOut = "LoggingOut",
  LoggedOut = "LoggedOut",
}

export interface LoginCompletedResponse {
  isAuthenticated: boolean;
  error?: string;
}

export function getUsernamePart(
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
