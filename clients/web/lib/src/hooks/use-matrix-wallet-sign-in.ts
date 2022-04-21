import {
  AuthenticationData,
  AuthenticationError,
  LoginFlows,
  LoginStatus,
  LoginTypePublicKey,
  PublicKeyEtheremParams,
  RegisterRequest,
  RegistrationAuthentication,
  PublicKeyEthereumHashFields,
  getChainIdEip155,
  getChainName,
  getParamsPublicKeyEthereum,
  getUsernameFromId,
  isLoginFlowPublicKeyEthereum,
  LoginTypePublicKeyEthereum,
} from "./login";
import { MatrixClient, MatrixError, createClient } from "matrix-js-sdk";
import { useCallback, useMemo } from "react";

import { StatusCodes } from "http-status-codes";
import keccak256 from "keccak256";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";
import { useWeb3Context } from "./use-web3";

interface NewSession {
  sessionId: string;
  version: number;
  chainIds: string[];
  error?: string;
}

interface SignedAuthenticationData {
  signature: string;
  hashFields: PublicKeyEthereumHashFields;
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

  const chainIdEip155 = useMemo(
    function () {
      if (chainId) {
        return getChainIdEip155(chainId);
      }
    },
    [chainId]
  );

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

  const authenticationSuccess = useCallback(function (response: any) {
    const { access_token, device_id, user_id } = response;
    if (access_token && device_id && user_id) {
      setAccessToken(access_token);
      setDeviceId(device_id);
      setUserId(user_id);
      setUsername(getUsernameFromId(user_id));
      setLoginStatus(LoginStatus.LoggedIn);
    } else {
      setLoginError({
        code: StatusCodes.UNAUTHORIZED,
        message:
          "Server did not return access_token, user_id, and / or device_id",
      });
      setLoginStatus(LoginStatus.LoggedOut);
    }
  }, []);

  const signMessage = useCallback(
    async function (
      sessionId: string,
      statementToSign: string
    ): Promise<SignedAuthenticationData | undefined> {
      console.log(`[signMessage] start`);
      const { messageToSign, hashFields } = createMessageToSign({
        walletAddress,
        chainId: chainIdEip155,
        homeServer,
        nonce: sessionId,
        statementToSign,
      });

      // Prompt the user to sign the message.
      const signature = await sign(messageToSign, walletAddress);

      if (signature) {
        console.log(`[signMessage] succeeded`, {
          signature,
          walletAddress,
          messageToSign,
          hashFields,
        });

        return {
          signature,
          hashFields,
          message: messageToSign,
        };
      }

      console.log(`[signMessage] end`);
    },
    [chainIdEip155, homeServer, sign, walletAddress]
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
    [homeServer, walletAddress]
  );

  const createAndSignAuthData = useCallback(
    async function (
      sessionId: string,
      statementToSign: string
    ): Promise<AuthenticationData | undefined> {
      try {
        const { signature, hashFields, message } = await signMessage(
          sessionId,
          statementToSign
        );
        if (signature) {
          // Send the signed message and auth data to the server.
          const auth: AuthenticationData = {
            type: LoginTypePublicKeyEthereum,
            session: sessionId,
            message,
            hashFields,
            signature,
            address: walletAddress,
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
        if (walletAddress && chainIdEip155 && homeServer) {
          // Signal to the UI that registration is in progress.
          setLoginStatus(LoginStatus.Registering);

          const matrixClient = createClient(homeServer);
          try {
            const { sessionId, chainIds, error } = await newRegisterSession(
              matrixClient,
              walletAddress
            );
            if (!error && sessionId && chainIds.includes(chainIdEip155)) {
              // Prompt the user to sign the message.
              const authData: AuthenticationData = await createAndSignAuthData(
                sessionId,
                statementToSign
              );
              const auth: RegistrationAuthentication = {
                type: LoginTypePublicKey,
                session: sessionId,
                public_key_response: authData,
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
                    LoginTypePublicKey
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
            } else if (!chainIds.includes(chainIdEip155)) {
              authenticationError({
                code: StatusCodes.UNAUTHORIZED,
                message: `Server does not allow registration for blockchain network ${getChainName(
                  chainIdEip155
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
                walletAddress: ${walletAddress ?? "undefined"},
                chainId: ${chainIdEip155 ?? "undefined"},
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
      chainIdEip155,
      createAndSignAuthData,
      homeServer,
      loginStatus,
      walletAddress,
    ]
  );

  const loginWithWallet = useCallback(
    async function (statementToSign: string): Promise<void> {
      // Login is allowed if the user is currently logged out.
      if (loginStatus === LoginStatus.LoggedOut) {
        if (walletAddress && chainIdEip155 && homeServer) {
          // Signal to the UI that login is in progress.
          setLoginStatus(LoginStatus.LoggingIn);

          const matrixClient = createClient(homeServer);
          try {
            const isPublicKeySignInSupported =
              await getPublicKeySignInSupported(matrixClient);
            if (isPublicKeySignInSupported) {
              const { sessionId, chainIds, error } = await newLoginSession(
                matrixClient
              );

              if (!error && sessionId && chainIds.includes(chainIdEip155)) {
                // Prompt the user to sign the message.
                const auth = await createAndSignAuthData(
                  sessionId,
                  statementToSign
                );

                if (auth) {
                  // Send the signed message and auth data to the server.
                  try {
                    const response = await matrixClient.login(
                      LoginTypePublicKey,
                      {
                        auth,
                      }
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
              } else if (!chainIds.includes(chainIdEip155)) {
                authenticationError({
                  code: StatusCodes.UNAUTHORIZED,
                  message: `Server does not allow login for blockchain network ${getChainName(
                    chainIdEip155
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
                walletAddress: ${walletAddress ?? "undefined"},
                chainId: ${chainIdEip155 ?? "undefined"},
                homeServer: ${homeServer ?? "undefined"},
              }`,
          });
        }
      }
    },
    [
      authenticationError,
      authenticationSuccess,
      chainIdEip155,
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
  statement: string,
  messageInfo: PublicKeyEthereumHashFields,
  hash: string
) {
  // See https://github.com/HereNotThere/harmony/blob/main/servers/matrix-publickey-login-spec.md for message template.

  return `${messageInfo.domain} wants you to sign in with your account:
${messageInfo.address}

${statement}

Hash: ${hash}
`;
}

async function getPublicKeySignInSupported(
  client: MatrixClient
): Promise<boolean> {
  // Get supported flows from the server.
  // loginFlows return type is wrong. Cast it to the expected type.
  const supportedFlows = (await client.loginFlows()) as unknown as LoginFlows;
  console.log(`Supported wallet login flows`, supportedFlows);
  return supportedFlows.flows.some((f) => f.type === LoginTypePublicKey);
}

function getAuthority(uri: string): string {
  const url = new URL(uri);
  const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  return authority;
}

function ensureSpecCompliantAuthenticationData(
  authInput: PublicKeyEthereumHashFields
): PublicKeyEthereumHashFields {
  // Parse and extract the RFC 3986 authority.
  const authority = getAuthority(authInput.domain);

  return {
    ...authInput,
    domain: authority,
  };
}

function createHash(messageFields: PublicKeyEthereumHashFields): string {
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
  hashFields: PublicKeyEthereumHashFields;
  messageToSign: string;
} {
  // Create the auth metadata for signing.
  const hashFields = ensureSpecCompliantAuthenticationData({
    domain: args.homeServer,
    address: args.walletAddress,
    version: "1",
    chainId: args.chainId,
    nonce: args.nonce,
  });

  const hash = createHash(hashFields);

  return {
    hashFields,
    messageToSign: createMessageFromTemplate(
      args.statementToSign,
      hashFields,
      hash
    ),
  };
}

async function newLoginSession(client: MatrixClient): Promise<NewSession> {
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
          `Server did not return information about the chain IDs or version`
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

async function newRegisterSession(
  client: MatrixClient,
  walletAddress: string
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
      console.log(
        `[newRegisterSession] Register session info`,
        loginFlows,
        params
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
  params: PublicKeyEtheremParams
): NewSession {
  return {
    sessionId,
    chainIds: params.chain_ids,
    version: params.version,
  };
}

function newSessionError(error: string): NewSession {
  return {
    sessionId: "",
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
