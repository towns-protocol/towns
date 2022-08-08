import {
  AuthenticationData,
  AuthenticationError,
  Eip4361Info,
  LoginFlows,
  LoginStatus,
  LoginTypePublicKey,
  LoginTypePublicKeyEthereum,
  PublicKeyEtheremParams,
  RegisterRequest,
  RegistrationAuthentication,
  getChainIdEip155,
  getChainName,
  getParamsPublicKeyEthereum,
  isLoginFlowPublicKeyEthereum,
} from "./login";
import { MatrixClient, MatrixError, createClient } from "matrix-js-sdk";
import {
  createUserIdFromEthereumAddress,
  getUsernameFromId,
} from "../types/user-identifier";
import { useCallback, useContext, useMemo } from "react";

import { SiweMessage } from "siwe";
import { StatusCodes } from "http-status-codes";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";
import { useWeb3Context } from "./use-web3";
import { ZionContext } from "../types/matrix-types";
import { MatrixContext } from "../components/MatrixContextProvider";

export interface NewSession {
  sessionId: string;
  version: number;
  chainIds: number[];
  nonce: string;
  error?: string;
}

interface SignedAuthenticationData {
  signature: string;
  message: string;
}

export function useMatrixWalletSignIn() {
  const {
    loginStatus,
    setLoginError,
    setLoginStatus,
    setDeviceId,
    setUserId,
    setUsername,
  } = useMatrixStore();
  const { homeServer } = useContext<ZionContext>(MatrixContext);
  const { setAccessToken } = useCredentialStore();
  const { accounts, sign } = useWeb3Context();
  const { chainId } = useWeb3Context();

  const chainIdEip155 = useMemo(
    function () {
      if (chainId) {
        return getChainIdEip155(chainId);
      }
    },
    [chainId],
  );

  const userIdentifier = useMemo(
    function () {
      if (accounts && accounts.length > 0 && chainIdEip155) {
        return createUserIdFromEthereumAddress(accounts[0], chainIdEip155);
      }
      return undefined;
    },
    [accounts, chainIdEip155],
  );

  const authenticationError = useCallback(
    function (error: AuthenticationError): void {
      console.error(error.message);
      setLoginStatus(LoginStatus.LoggedOut);
      setLoginError(error);
    },
    [setLoginError, setLoginStatus],
  );

  const authenticationSuccess = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function (response: any) {
      const { access_token, device_id, user_id } = response;
      if (access_token && device_id && user_id) {
        setAccessToken(access_token);
        setDeviceId(device_id);
        setLoginStatus(LoginStatus.LoggedIn);
        setUserId(user_id);
        setUsername(getUsernameFromId(user_id));
      } else {
        setLoginError({
          code: StatusCodes.UNAUTHORIZED,
          message:
            "Server did not return access_token, user_id, and / or device_id",
        });
        setLoginStatus(LoginStatus.LoggedOut);
      }
    },
    [
      setAccessToken,
      setDeviceId,
      setLoginError,
      setLoginStatus,
      setUserId,
      setUsername,
    ],
  );

  const signMessage = useCallback(
    async function (args: {
      statement: string;
      nonce: string;
    }): Promise<SignedAuthenticationData | undefined> {
      console.log(`[signMessage] start`);
      if (!userIdentifier) {
        console.log(`[signMessage] no userIdentifier`);
        return undefined;
      }
      if (!homeServer) {
        console.log(`[signMessage] undefined homeServer`);
        return undefined;
      }
      const messageToSign = createMessageToSign({
        walletAddress: userIdentifier.accountAddress,
        chainId: userIdentifier.chainId,
        homeServer,
        origin,
        nonce: args.nonce,
        statement: args.statement,
      });

      // Prompt the user to sign the message.
      const signature = await sign(
        messageToSign,
        userIdentifier.accountAddress,
      );

      if (signature) {
        console.log(`[signMessage] succeeded`, {
          signature,
          userIdentifier,
          messageToSign,
        });

        return {
          signature,
          message: messageToSign,
        };
      }

      console.log(`[signMessage] end`);
    },
    [homeServer, sign, userIdentifier],
  );

  const getIsWalletIdRegistered = useCallback(
    async function (): Promise<boolean> {
      if (homeServer && userIdentifier) {
        const matrixClient = createClient(homeServer);
        try {
          // isUsernameAvailable returns true if you can register
          // a new account for that id.
          const isAvailable = await matrixClient.isUsernameAvailable(
            userIdentifier.matrixUserIdLocalpart,
          );
          // Not available means the id is registered
          const isRegistered = isAvailable === false;
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
    [homeServer, userIdentifier],
  );

  const createAndSignAuthData = useCallback(
    async function (args: {
      sessionId: string;
      nonce: string;
      statement: string;
    }): Promise<AuthenticationData | undefined> {
      try {
        if (!userIdentifier) {
          console.log(`[createAndSignAuthData] no userIdentifier`);
          return undefined;
        }
        const signedAuthenticationData = await signMessage({
          nonce: args.nonce,
          statement: args.statement,
        });
        if (!signedAuthenticationData) {
          console.log(
            `[createAndSignAuthData] undefined signedAuthenticationData`,
          );
          return undefined;
        }
        const { signature, message } = signedAuthenticationData;
        if (signature) {
          // Send the signed message and auth data to the server.
          const auth: AuthenticationData = {
            type: LoginTypePublicKeyEthereum,
            session: args.sessionId,
            message,
            signature,
            user_id: userIdentifier.matrixUserIdLocalpart,
          };
          return auth;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(ex.message);
      }
      return undefined;
    },
    [signMessage, userIdentifier],
  );

  const registerWallet = useCallback(
    async function (statement: string): Promise<void> {
      console.log(`[registerWallet] start`);
      // Registration of a new wallet is allowed if the user is currently logged out.
      if (loginStatus === LoginStatus.LoggedOut) {
        if (userIdentifier && userIdentifier.chainId && homeServer) {
          // Signal to the UI that registration is in progress.
          setLoginStatus(LoginStatus.Registering);

          const matrixClient = createClient(homeServer);
          try {
            const { sessionId, chainIds, nonce, error } =
              await newRegisterSession(
                matrixClient,
                userIdentifier.matrixUserIdLocalpart,
              );
            if (
              !error &&
              sessionId &&
              chainIds.includes(userIdentifier.chainId)
            ) {
              // Prompt the user to sign the message.
              const authData: AuthenticationData | undefined =
                await createAndSignAuthData({
                  sessionId,
                  statement,
                  nonce,
                });

              const auth: RegistrationAuthentication | undefined = authData
                ? {
                    type: LoginTypePublicKey,
                    session: sessionId,
                    public_key_response: authData,
                  }
                : undefined;

              if (auth) {
                // Send the signed message and auth data to the server.
                try {
                  const request: RegisterRequest = {
                    auth,
                    username: userIdentifier.matrixUserIdLocalpart,
                  };
                  console.log(
                    `[registerWallet] sending registerRequest`,
                    request,
                  );

                  const response = await matrixClient.registerRequest(
                    request,
                    LoginTypePublicKey,
                  );
                  console.log(
                    `[registerWallet] received response from registerRequest`,
                    response,
                  );

                  if (response.access_token) {
                    authenticationSuccess(response);
                  } else {
                    authenticationError({
                      code: StatusCodes.UNAUTHORIZED,
                      message: `Attempt to register wallet ${userIdentifier.matrixUserId} failed!`,
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
                    code: error.httpStatus ?? 0,
                    message: error.message,
                  });
                }
              } else {
                authenticationError({
                  code: StatusCodes.UNAUTHORIZED,
                  message: `Attempt to sign the registration message failed!`,
                });
              }
            } else if (!chainIds.includes(userIdentifier.chainId)) {
              authenticationError({
                code: StatusCodes.UNAUTHORIZED,
                message: `Server does not allow registration for blockchain network ${getChainName(
                  userIdentifier.chainId,
                )}`,
              });
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
                userIdentifier: ${userIdentifier?.matrixUserId ?? "undefined"},
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
      createAndSignAuthData,
      homeServer,
      loginStatus,
      setLoginStatus,
      userIdentifier,
    ],
  );

  const loginWithWallet = useCallback(
    async function (statement: string): Promise<void> {
      // Login is allowed if the user is currently logged out.
      if (loginStatus === LoginStatus.LoggedOut) {
        if (userIdentifier && userIdentifier.chainId && homeServer) {
          // Signal to the UI that login is in progress.
          setLoginStatus(LoginStatus.LoggingIn);

          const matrixClient = createClient(homeServer);
          try {
            const isPublicKeySignInSupported =
              await getPublicKeySignInSupported(matrixClient);
            if (isPublicKeySignInSupported) {
              const { sessionId, chainIds, nonce, error } =
                await newLoginSession(matrixClient);

              if (
                !error &&
                sessionId &&
                chainIds.includes(userIdentifier.chainId)
              ) {
                // Prompt the user to sign the message.
                const auth = await createAndSignAuthData({
                  sessionId,
                  statement,
                  nonce,
                });

                if (auth) {
                  // Send the signed message and auth data to the server.
                  try {
                    const response = await matrixClient.login(
                      LoginTypePublicKey,
                      {
                        auth,
                      },
                    );

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
                      code: error.httpStatus ?? 0,
                      message: error.message,
                    });
                  }
                } else {
                  authenticationError({
                    code: StatusCodes.UNAUTHORIZED,
                    message: `Attempt to sign the login message failed!`,
                  });
                }
              } else if (!chainIds.includes(userIdentifier.chainId)) {
                authenticationError({
                  code: StatusCodes.UNAUTHORIZED,
                  message: `Server does not allow login for blockchain network ${getChainName(
                    userIdentifier.chainId,
                  )}`,
                });
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
                userIdentifier: ${userIdentifier?.matrixUserId ?? "undefined"},
                homeServer: ${homeServer ?? "undefined"},
              }`,
          });
        }
      }
    },
    [
      authenticationError,
      authenticationSuccess,
      createAndSignAuthData,
      homeServer,
      loginStatus,
      setLoginStatus,
      userIdentifier,
    ],
  );

  return {
    getIsWalletIdRegistered,
    loginWithWallet,
    registerWallet,
  };
}

async function getPublicKeySignInSupported(
  client: MatrixClient,
): Promise<boolean> {
  // Get supported flows from the server.
  // loginFlows return type is wrong. Cast it to the expected type.
  const supportedFlows = (await client.loginFlows()) as unknown as LoginFlows;
  console.log(`Supported wallet login flows`, supportedFlows);
  return supportedFlows.flows.some((f) => f.type === LoginTypePublicKey);
}

export function getAuthority(uri: string): string {
  const url = new URL(uri);
  // Bug in siwe-go package on the server. Doesn't recognize port.
  //const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  return url.hostname;
}

/**
 * Create a message for signing. See https://eips.ethereum.org/EIPS/eip-4361
 * for message template.
 */
export function createMessageToSign(args: {
  walletAddress: string;
  chainId: number;
  homeServer: string;
  origin: string;
  nonce: string;
  statement: string;
}): string {
  // Create the auth metadata for signing.
  const eip4361: Eip4361Info = {
    authority: getAuthority(args.homeServer),
    address: args.walletAddress,
    version: "1",
    chainId: args.chainId,
    nonce: args.nonce,
    statement: args.statement,
  };
  const siweMessage = new SiweMessage({
    domain: eip4361.authority,
    address: eip4361.address,
    statement: eip4361.statement,
    uri: args.origin,
    version: "1",
    chainId: eip4361.chainId,
    nonce: eip4361.nonce,
  });

  console.log(`[createMessageToSign][SiweMessage]`, siweMessage);

  const messageToSign = siweMessage.prepareMessage();
  console.log(
    `[createMessageToSign][siweMessage.prepareMessage]`,
    messageToSign,
  );

  return messageToSign;
}

export async function newLoginSession(
  client: MatrixClient,
): Promise<NewSession> {
  console.log(`[newLoginSession] start`);
  try {
    // According to the Client-Server API specm send a GET
    // request without arguments to start a new login session.
    await client.login(LoginTypePublicKey, {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    // https://spec.matrix.org/v1.2/client-server-api/#user-interactive-api-in-the-rest-api
    // Per spec, expect an exception with the session ID
    const error = ex as MatrixError;
    printMatrixError(error, `[newLoginSession]`);

    if (
      // Expected 401
      error.httpStatus === StatusCodes.UNAUTHORIZED &&
      isLoginFlowPublicKeyEthereum(error.data)
    ) {
      const loginFlows = error.data;
      const params = getParamsPublicKeyEthereum(loginFlows.params);
      console.log(`[newLoginSession] Login session info`, loginFlows, params);
      if (params) {
        return newSessionSuccess(loginFlows.session, params);
      } else {
        return newSessionError(
          `Server did not return information about the chain IDs or version`,
        );
      }
    } else {
      return newSessionError(`${error.httpStatus} ${error.message}`);
    }
  }

  console.log(`[newLoginSession] end`);
  // Always fail auth if it reaches here.
  return newSessionError("Unauthorized");
}

export async function newRegisterSession(
  client: MatrixClient,
  walletAddress: string,
): Promise<NewSession> {
  console.log(`[newRegisterSession] start`);
  try {
    // https://spec.matrix.org/v1.2/client-server-api/#post_matrixclientv3register
    const requestData = {
      auth: { type: LoginTypePublicKey },
      username: walletAddress,
    };
    await client.registerRequest(requestData, LoginTypePublicKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    // https://spec.matrix.org/v1.2/client-server-api/#user-interactive-api-in-the-rest-api
    // Per spec, expect an exception with the session ID
    const error = ex as MatrixError;
    printMatrixError(error, `[newRegisterSession]`);

    if (
      // Expected 401
      error.httpStatus === StatusCodes.UNAUTHORIZED &&
      isLoginFlowPublicKeyEthereum(error.data)
    ) {
      const loginFlows = error.data;
      const params = getParamsPublicKeyEthereum(error.data.params);
      if (!params) {
        console.log("[newRegisterSession] No public key ethereum params");
        return newSessionError(`${error.httpStatus} ${error.message}`);
      }
      console.log(
        ` [newRegisterSession] Register session info`,
        loginFlows,
        params,
      );
      return newSessionSuccess(loginFlows.session, params);
    } else {
      return newSessionError(`${error.httpStatus} ${error.message}`);
    }
  }

  console.log(`[newRegisterSession] end`);
  // Always fail auth if it reaches here.
  return newSessionError("Unauthorized");
}

function newSessionSuccess(
  sessionId: string,
  params: PublicKeyEtheremParams,
): NewSession {
  return {
    sessionId,
    chainIds: params.chain_ids,
    version: params.version,
    nonce: params.nonce,
  };
}

function newSessionError(error: string): NewSession {
  return {
    sessionId: "",
    nonce: "",
    chainIds: [],
    version: 0,
    error,
  };
}

function printMatrixError(error: MatrixError, label?: string): void {
  label = label ?? "";
  console.log(label, {
    errcode: error.errcode,
    httpStatus: error.httpStatus,
    message: error.message,
    name: error.name,
    data: error.data,
  });
}
