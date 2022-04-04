import {
  AuthenticationData,
  AuthenticationError,
  LoginFlows,
  LoginStatus,
  LoginTypeWallet,
  RegisterRequest,
  RegistrationAuthentication,
  WalletMessageFields,
  getUsernameFromId,
  isLoginFlow,
} from "./login";
import {
  LoginPayload,
  MatrixClient,
  MatrixError,
  createClient,
} from "matrix-js-sdk";
import { useCallback, useMemo } from "react";

import { StatusCodes } from "http-status-codes";
import keccak256 from "keccak256";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";
import { useWeb3Context } from "./use-web3";

interface NewSession {
  sessionId: string;
  error?: string;
}

interface SignedWalletData {
  signature: string;
  messageFields: WalletMessageFields;
  message: string;
}

export function useMatrixWalletSignIn() {
  const {
    homeServer,
    loginStatus,
    setLoginError,
    setLoginStatus,
    setDeviceId,
    setUserId,
    setUsername,
  } = useMatrixStore();
  const { setAccessToken } = useCredentialStore();
  const { accounts, chainId, sign } = useWeb3Context();

  const walletAddress = useMemo(
    () =>
      accounts && accounts.length > 0 ? accounts[0].toLowerCase() : undefined,
    [accounts]
  );

  const authenticationError = useCallback(function (
    error: AuthenticationError
  ): void {
    console.error(error.message);
    setLoginStatus(LoginStatus.LoggedOut);
    setLoginError(error);
  },
  []);

  const authenticationSuccess = useCallback(function (response: LoginPayload) {
    setAccessToken(response.access_token);
    setDeviceId(response.device_id);
    setUserId(response.user_id);
    setUsername(getUsernameFromId(response.user_id));
    setLoginStatus(LoginStatus.LoggedIn);
  }, []);

  const signMessage = useCallback(
    async function (
      sessionId: string,
      statementToSign: string
    ): Promise<SignedWalletData | undefined> {
      console.log(`[signMessage] start`);
      const { messageToSign, messageFields } = createMessageToSign({
        walletAddress,
        chainId,
        homeServer,
        nonce: sessionId,
        statementToSign,
      });

      // Prompt the user to sign the message.
      const signature = await sign(messageToSign, walletAddress);

      if (signature) {
        console.log(`[signMessage] signing succeeded`, {
          signature,
          walletAddress,
          messageToSign,
          messageFields,
        });

        return {
          signature,
          messageFields,
          message: messageToSign,
        };
      }

      console.log(`[signMessage] end`);
    },
    [chainId, homeServer, sign, walletAddress]
  );

  const getIsWalletIdRegistered = useCallback(
    async function (): Promise<boolean> {
      if (homeServer && walletAddress) {
        const matrixClient = createClient(homeServer);
        try {
          // isUsernameAvailable returns true if you can register
          // a new account for that id.
          const isAvailable = await matrixClient.isUsernameAvailable(
            walletAddress
          );
          // Not available means the id is registered
          const isRegistered = isAvailable == false;
          console.log(`[getWalletIdRegistered] ${isRegistered}`);
          return isRegistered;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (ex: any) {
          console.error(ex.message);
        }
      }
      // Assumption: if wallet id is not available (free to register), then it is registered.
      console.log(`[getWalletIdRegistered] true`);
      return true;
    },
    [homeServer, walletAddress]
  );

  const createAndSignAuthData = useCallback(
    async function (
      sessionId: string,
      statementToSign: string
    ): Promise<AuthenticationData | undefined> {
      try {
        const { signature, messageFields, message } = await signMessage(
          sessionId,
          statementToSign
        );
        if (signature) {
          // Send the signed message and auth data to the server.
          const auth: AuthenticationData = {
            type: LoginTypeWallet,
            session: sessionId,
            message,
            messageFields,
            signature,
            walletAddress,
          };
          return auth;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(ex.message);
      }
      return undefined;
    },
    [signMessage, walletAddress]
  );

  const registerWallet = useCallback(
    async function (statementToSign: string): Promise<void> {
      console.log(`[registerWallet] start`);
      // Registration of a new wallet is allowed if the user is currently logged out.
      if (loginStatus === LoginStatus.LoggedOut) {
        if (walletAddress && chainId && homeServer) {
          // Signal to the UI that registration is in progress.
          setLoginStatus(LoginStatus.Registering);

          const matrixClient = createClient(homeServer);
          try {
            const { sessionId, error } = await newRegisterSession(
              matrixClient,
              walletAddress
            );
            if (!error && sessionId) {
              // Prompt the user to sign the message.
              const authData: AuthenticationData = await createAndSignAuthData(
                sessionId,
                statementToSign
              );
              const auth: RegistrationAuthentication = {
                type: LoginTypeWallet,
                session: sessionId,
                walletResponse: authData,
              };

              if (auth) {
                // Send the signed message and auth data to the server.
                try {
                  const request: RegisterRequest = {
                    auth,
                    username: walletAddress,
                  };
                  console.log(
                    `[registerWallet] sending registerRequest`,
                    request
                  );
                  const response = await matrixClient.registerRequest(
                    request,
                    LoginTypeWallet
                  );
                  console.log(
                    `[registerWallet] received response from registerRequest`,
                    response
                  );

                  if (response.access_token) {
                    authenticationSuccess(response);
                  } else {
                    authenticationError({
                      code: StatusCodes.UNAUTHORIZED,
                      message: `Attempt to register wallet ${walletAddress} failed!`,
                    });
                  }
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (ex: any) {
                  const error = ex as MatrixError;
                  console.error(`[registerWallet] error`, {
                    errcode: error.errcode,
                    httpStatus: error.httpStatus,
                    message: error.message,
                    name: error.name,
                    data: error.data,
                  });
                  authenticationError({
                    code: error.httpStatus,
                    message: error.message,
                  });
                }
              } else {
                authenticationError({
                  code: StatusCodes.UNAUTHORIZED,
                  message: `Attempt to sign the registration message failed!`,
                });
              }
            } else {
              authenticationError({
                code: StatusCodes.UNAUTHORIZED,
                message: `New registration session failed. Error: ${error}`,
              });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (ex: any) {
            authenticationError({
              code: StatusCodes.UNAUTHORIZED,
              message: `Server error during wallet registration ${ex.message}`,
            });
          }
        } else {
          authenticationError({
            code: StatusCodes.UNAUTHORIZED,
            message: `Missing information for wallet registration {
                walletAddress: ${walletAddress ?? "undefined"},
                chainId: ${chainId ?? "undefined"},
                homeServer: ${homeServer ?? "undefined"},
              }`,
          });
        }
      }
      console.log(`[registerWallet] end`);
    },
    [
      authenticationError,
      authenticationSuccess,
      chainId,
      createAndSignAuthData,
      homeServer,
      loginStatus,
      walletAddress,
    ]
  );

  const loginWithWallet = useCallback(
    async function (statementToSign: string): Promise<void> {
      // Login is allowed if the user is currently logged out.
      console.log(`[loginWithWallet] start`);
      if (loginStatus === LoginStatus.LoggedOut) {
        if (walletAddress && chainId && homeServer) {
          // Signal to the UI that login is in progress.
          setLoginStatus(LoginStatus.LoggingIn);

          const matrixClient = createClient(homeServer);
          try {
            const isWalletSignInSupported = await getWalletSignInSupported(
              matrixClient
            );
            if (isWalletSignInSupported) {
              const { sessionId, error } = await newLoginSession(matrixClient);
              if (!error && sessionId) {
                // Prompt the user to sign the message.
                const auth = await createAndSignAuthData(
                  sessionId,
                  statementToSign
                );

                if (auth) {
                  // Send the signed message and auth data to the server.
                  try {
                    const response = await matrixClient.login(LoginTypeWallet, {
                      auth,
                    });

                    if (response.access_token) {
                      authenticationSuccess(response);
                    } else {
                      authenticationError({
                        code: StatusCodes.UNAUTHORIZED,
                        message: `Attempt to sign in failed!`,
                      });
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } catch (ex: any) {
                    const error = ex as MatrixError;
                    console.error(`[loginWithWallet] error`, {
                      errcode: error.errcode,
                      httpStatus: error.httpStatus,
                      message: error.message,
                      name: error.name,
                      data: error.data,
                    });
                    authenticationError({
                      code: error.httpStatus,
                      message: error.message,
                    });
                  }
                } else {
                  authenticationError({
                    code: StatusCodes.UNAUTHORIZED,
                    message: `Attempt to sign the login message failed!`,
                  });
                }
              } else {
                authenticationError({
                  code: StatusCodes.UNAUTHORIZED,
                  message: `New login session failed. Error: ${error}`,
                });
              }
            } else {
              authenticationError({
                code: StatusCodes.FORBIDDEN,
                message: `Server does not support wallet sign in!`,
              });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (ex: any) {
            authenticationError({
              code: StatusCodes.UNAUTHORIZED,
              message: `Server error during wallet sign in ${ex.message}`,
            });
          }
        } else {
          authenticationError({
            code: StatusCodes.UNAUTHORIZED,
            message: `Missing information for login {
                walletAddress: ${walletAddress ?? "undefined"},
                chainId: ${chainId ?? "undefined"},
                homeServer: ${homeServer ?? "undefined"},
              }`,
          });
        }
      }
      console.log(`[loginWithWallet] end`);
    },
    [
      authenticationError,
      authenticationSuccess,
      chainId,
      createAndSignAuthData,
      homeServer,
      loginStatus,
      walletAddress,
    ]
  );

  return {
    getIsWalletIdRegistered,
    loginWithWallet,
    registerWallet,
  };
}

/**
 * Create a message for signing. See https://eips.ethereum.org/EIPS/eip-4361
 * for message template.
 * 
 * Note: *** It is important to preserve the \n in the message. Signature verification
 * includes the \n in the template.
 * 
 * Example message to be signed:

service.org wants you to sign in with your wallet account:
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

I accept the ServiceOrg Terms of Service: https://service.org/tos

URI: https://service.org/login
Version: 1
Chain ID: 1
Hash: yfSIwarByPfKFxeYSCWN3XoIgNgeEFJffbwFA+JxYbA=
Issued At: 2021-09-30T16:25:24Z
Resources:
- ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/
- https://example.com/my-web2-claim.json
 * 
 */
function createMessageFromTemplate(
  messageInfo: WalletMessageFields,
  hash: string
) {
  // See https://eips.ethereum.org/EIPS/eip-4361 for message template.

  // Change resources into the format:
  // - ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/
  // - https://example.com/my-web2-claim.json

  return `${
    messageInfo.authority
  } wants you to sign in with your wallet account:
${messageInfo.address}

${messageInfo.statement ? `${messageInfo.statement}\n` : ""}\nURI: ${
    messageInfo.uri
  }
Version: ${messageInfo.version}
Chain ID: ${messageInfo.chainId}
Hash: ${hash}
Issued At: ${messageInfo.issuedAt.toISOString()}${
    messageInfo.expirationTime
      ? `\nExpiration Time: ${messageInfo.expirationTime.toISOString()}`
      : ""
  }${
    messageInfo.notBefore
      ? `\nNot Before: ${messageInfo.notBefore.toISOString()}`
      : ""
  }${messageInfo.requestId ? `\nRequest ID: ${messageInfo.requestId}` : ""}${
    messageInfo.resources && messageInfo.resources.length > 0
      ? `\nResources:${messageInfo.resources
          .map((resource: string) => `\n- ${resource}`)
          .join("")}`
      : ""
  }`;
}

async function getWalletSignInSupported(
  client: MatrixClient
): Promise<boolean> {
  // Get supported flows from the server.
  // loginFlows return type is wrong. Cast it to the expected type.
  const supportedFlows = (await client.loginFlows()) as unknown as LoginFlows;
  console.log(`Supported wallet login flows`, supportedFlows);
  return supportedFlows.flows.some((f) => f.type === LoginTypeWallet);
}

function getAuthority(uri: string): string {
  const url = new URL(uri);
  const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  return authority;
}

function ensureSpecCompliantAuthenticationData(
  authInput: WalletMessageFields
): WalletMessageFields {
  // Parse and extract the RFC 3986 authority.
  const authority = getAuthority(authInput.authority);

  // statement must not contain any \n per EIPS spec.
  //const statement = authInput.statement;
  const statement = authInput.statement
    ? authInput.statement.replace(/\n/g, "")
    : undefined;

  // ChainId should not have 0x prefix.
  // https://eips.ethereum.org/EIPS/eip-155
  const chainId = authInput.chainId.replace(/0x/g, "");

  return {
    ...authInput,
    authority,
    statement,
    chainId,
  };
}

function createHash(messageFields: WalletMessageFields): string {
  const fieldStr = JSON.stringify(messageFields);
  const hash = keccak256(fieldStr).toString("base64");
  console.log(`createHash`, { hash, fieldStr });
  return hash;
}

function createMessageToSign(args: {
  walletAddress: string;
  chainId: string;
  homeServer: string;
  nonce: string;
  statementToSign: string;
}): {
  messageFields: WalletMessageFields;
  messageToSign: string;
} {
  // Create the auth metadata for signing.
  const messageFields = ensureSpecCompliantAuthenticationData({
    authority: args.homeServer,
    address: args.walletAddress,
    statement: args.statementToSign,
    uri: `${args.homeServer}/login`,
    version: "1",
    chainId: args.chainId,
    nonce: args.nonce,
    issuedAt: new Date(),
  });

  const hash = createHash(messageFields);

  return {
    messageFields,
    messageToSign: createMessageFromTemplate(messageFields, hash),
  };
}

async function newLoginSession(client: MatrixClient): Promise<NewSession> {
  console.log(`[newLoginSession] start`);
  try {
    // According to the Client-Server API specm send a GET
    // request without arguments to start a new login session.
    await client.login(LoginTypeWallet, {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    // https://spec.matrix.org/v1.2/client-server-api/#user-interactive-api-in-the-rest-api
    // Per spec, expect an exception with the session ID
    const error = ex as MatrixError;
    console.log(`[newLoginSession]`, {
      errcode: error.errcode,
      httpStatus: error.httpStatus,
      message: error.message,
      name: error.name,
      data: error.data,
    });

    if (
      // Expected 401
      error.httpStatus === StatusCodes.UNAUTHORIZED &&
      isLoginFlow(error.data)
    ) {
      const loginFlows = error.data;
      console.log(`[newLoginSession] Login session info`, loginFlows);
      return {
        sessionId: loginFlows.session,
      };
    } else {
      return {
        sessionId: "",
        error: `${error.httpStatus} ${error.message}`,
      };
    }
  }

  console.log(`[newLoginSession] end`);
  // Always fail auth if it reaches here.
  return {
    sessionId: "",
    error: "Unauthorized",
  };
}

async function newRegisterSession(
  client: MatrixClient,
  walletAddress: string
): Promise<NewSession> {
  console.log(`[newRegisterSession] start`);
  try {
    // https://spec.matrix.org/v1.2/client-server-api/#post_matrixclientv3register
    const requestData = {
      auth: { type: LoginTypeWallet },
      username: walletAddress,
    };
    await client.registerRequest(requestData, LoginTypeWallet);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    // https://spec.matrix.org/v1.2/client-server-api/#user-interactive-api-in-the-rest-api
    // Per spec, expect an exception with the session ID
    const error = ex as MatrixError;
    console.log(`[newRegisterSession]`, {
      errcode: error.errcode,
      httpStatus: error.httpStatus,
      message: error.message,
      name: error.name,
      data: error.data,
    });

    if (
      // Expected 401
      error.httpStatus === StatusCodes.UNAUTHORIZED &&
      isLoginFlow(error.data)
    ) {
      const loginFlows = error.data;
      console.log(`[newRegisterSession] Register session info`, loginFlows);
      return {
        sessionId: loginFlows.session,
      };
    } else {
      return {
        sessionId: "",
        error: `${error.httpStatus} ${error.message}`,
      };
    }
  }

  console.log(`[newRegisterSession] end`);
  // Always fail auth if it reaches here.
  return {
    sessionId: "",
    error: "Unauthorized",
  };
}
