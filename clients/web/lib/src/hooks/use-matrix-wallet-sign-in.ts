import { LogInStatus, LogInCompletedResponse } from "./login";
import { useCallback, useMemo } from "react";

import { Base64 } from "js-base64";
import { StatusCodes } from "http-status-codes";
import keccak256 from "keccak256";
import stringify from "fast-json-stable-stringify";
import { useMatrixStore } from "../store/use-matrix-store";
import { useWeb3Context } from "./use-web3";

const isBrowser = typeof window !== "undefined";

interface WalletSignInNewSessionResponse {
  walletAddress: string;
  chainId: string;
  homeServer: string;
  nonce: string;
  error?: string;
}

interface WalletSignInNewSessionRequest {
  walletAddress: string;
  chainId: string;
  homeServer: string;
}

interface AuthenticationRequestData {
  // https://eips.ethereum.org/EIPS/eip-4361
  authority: string; // is the RFC 3986 authority that is requesting the signing.
  address: string; // is the Ethereum address performing the signing conformant to capitalization encoded checksum specified in EIP-55 where applicable.
  statement?: string; // (optional) is a human-readable ASCII assertion that the user will sign, and it must not contain '\n' (the byte 0x0a).
  uri: string; // is an RFC 3986 URI referring to the resource that is the subject of the signing (as in the subject of a claim).
  version: string; // is the current version of the message, which MUST be 1 for this specification.
  chainId: string; // is the EIP-155 Chain ID to which the session is bound, and the network where Contract Accounts must be resolved.
  nonce: string; // is a randomized token used to prevent replay attacks, at least 8 alphanumeric characters.
  issuedAt: Date; //  is the ISO 8601 datetime string of the current time.
  expirationTime?: Date; //  (optional) is the ISO 8601 datetime string that, if present, indicates when the signed authentication message is no longer valid.
  notBefore?: Date; //  (optional) is the ISO 8601 datetime string that, if present, indicates when the signed authentication message will become valid.
  requestId?: string; // (optional) is an system-specific identifier that may be used to uniquely refer to the sign-in request.
  resources?: string[]; // (optional) is a list of information or references to information the user wishes to have resolved as part of authentication by the relying party. They are expressed as RFC 3986 URIs separated by "\n- ".
}

export function useMatrixWalletSignIn() {
  const { homeServer, logInStatus, setLogInStatus } = useMatrixStore();
  const { accounts, chainId, sign } = useWeb3Context();

  const walletAddress = useMemo(
    () => (accounts && accounts.length > 0 ? accounts[0] : undefined),
    [accounts]
  );

  const authenticationError = useCallback(function (
    error: string
  ): LogInCompletedResponse {
    setLogInStatus(LogInStatus.LoggedOut);
    console.error(error);
    return {
      isAuthenticated: false,
      error,
    };
  },
  []);

  /**
   * This function does the following:
   * 1. Create the authentication request message.
   * 2. Prompts the user to sign the message.
   * 3. Sends the signed message and request data to the server.
   * 4. Updates the store with the server's response (like access token).
   */
  const loginWithWallet = useCallback(
    async function (statementToSign: string): Promise<LogInCompletedResponse> {
      // Login attempt is allowed if the user is currently logged out.
      if (logInStatus === LogInStatus.LoggedOut) {
        if (walletAddress && chainId && homeServer) {
          setLogInStatus(LogInStatus.LoggingIn);

          // Todo: Get sign-in auth info from server.
          const sessionResponse = getWalletSignInNewSession({
            walletAddress,
            chainId,
            homeServer,
          });

          console.log(`[loginWithWallet] got server response`, sessionResponse);

          if (verifyServerResponse(sessionResponse)) {
            // Create the auth metadata for signing.
            const authRequestData = ensureSpecCompliantAuthenticationData({
              authority: sessionResponse.homeServer,
              address: walletAddress,
              statement: statementToSign,
              uri: `${sessionResponse.homeServer}/login`,
              version: "1",
              chainId,
              nonce: sessionResponse.nonce,
              issuedAt: new Date(),
            });

            const authRequestHash = keccak256(
              stringify(authRequestData)
            ).toString("base64");

            const messageToSign = createMessageToSign(
              authRequestData,
              authRequestHash
            );

            // Prompt the user to sign the message.
            const signature = await sign(messageToSign, walletAddress);

            if (signature) {
              console.log(`[loginWithWallet] signing succeeded`, {
                signature,
                walletAddress,
                messageToSign,
              });

              // Todo: Send the signed message and auth data to the server.
              const status = postAuthenticationRequest({
                message: messageToSign,
                signature,
                requestData: authRequestData,
              });

              switch (status) {
                case 200: {
                  // Log in succeeded. Post processing.
                  console.log(`[loginWithWallet] post auth processing`);
                  setLogInStatus(LogInStatus.LoggedIn);
                  console.log(`[loginWithWallet] post auth processing done`);
                  return {
                    isAuthenticated: true,
                  };
                }
                default:
                  return authenticationError(
                    `Authentication request failed with status: ${status}}`
                  );
              }
            } else {
              return authenticationError(
                `Attempt to sign the login message failed!`
              );
            }
          } else {
            return authenticationError(
              `Request to start a new authentication session failed. ${sessionResponse.error}`
            );
          }
        } else {
          return authenticationError(`Missing information for logging in {
            walletAddress: ${walletAddress ?? "undefined"},
            chainId: ${chainId ?? "undefined"},
            homeServer: ${homeServer ?? "undefined"},
          }`);
        }
      }

      return {
        isAuthenticated: logInStatus === LogInStatus.LoggedIn,
      };
    },
    [chainId, homeServer, logInStatus, sign, walletAddress]
  );

  return {
    loginWithWallet,
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

service.org wants you to sign in with your Ethereum account:
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

I accept the ServiceOrg Terms of Service: https://service.org/tos

URI: https://service.org/login
Version: 1
Chain ID: 1
Nonce: 32891756
Issued At: 2021-09-30T16:25:24Z
Resources:
- ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/
- https://example.com/my-web2-claim.json
 * 
 */
function createMessageToSign(
  messageInfo: AuthenticationRequestData,
  authRequestHash?: string
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
Nonce: ${messageInfo.nonce}
Issued At: ${messageInfo.issuedAt.toISOString()}${
    messageInfo.expirationTime
      ? `\nExpiration Time: ${messageInfo.expirationTime.toISOString()}`
      : ""
  }${
    messageInfo.notBefore
      ? `\nNot Before: ${messageInfo.notBefore.toISOString()}`
      : ""
  }${messageInfo.requestId ? `\nRequest ID: ${messageInfo.requestId}` : ""}${
    authRequestHash ? `\nRequest Hash: ${authRequestHash}` : ""
  }${
    messageInfo.resources && messageInfo.resources.length > 0
      ? `\nResources:${messageInfo.resources
          .map((resource: string) => `\n- ${resource}`)
          .join("")}`
      : ""
  }`;
}

function getWalletSignInNewSession(
  newSessionData: WalletSignInNewSessionRequest
): WalletSignInNewSessionResponse {
  let nonce = "";
  if (isBrowser) {
    const nonceArray = new Uint8Array(16);
    window.crypto.getRandomValues(nonceArray);
    // Since this is going in the URL query string it needs to be URL safe
    nonce = Base64.fromUint8Array(nonceArray, true);
  }

  // Todo: get nonce from server.

  // Fake response from server.
  return {
    walletAddress: newSessionData.walletAddress,
    chainId: newSessionData.chainId,
    homeServer: newSessionData.homeServer,
    nonce,
  };
}

function getAuthority(uri: string): string {
  const url = new URL(uri);
  const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  return authority;
}

function verifyServerResponse(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  response: WalletSignInNewSessionResponse
): boolean {
  // Todo: verify server's response
  return true;
}

function ensureSpecCompliantAuthenticationData(
  authInput: AuthenticationRequestData
): AuthenticationRequestData {
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

interface AuthenticationRequest {
  message: string;
  signature: string;
  requestData: AuthenticationRequestData;
}

function postAuthenticationRequest(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  authRequest: AuthenticationRequest
): number | void {
  // Todo: Post auth request to the server;
  return StatusCodes.OK;
}
