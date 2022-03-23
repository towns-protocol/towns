"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMatrixWalletSignIn = void 0;
const login_1 = require("./login");
const react_1 = require("react");
const js_base64_1 = require("js-base64");
const http_status_codes_1 = require("http-status-codes");
const keccak256_1 = __importDefault(require("keccak256"));
const fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
const use_matrix_store_1 = require("../store/use-matrix-store");
const use_web3_1 = require("./use-web3");
const isBrowser = typeof window !== "undefined";
function useMatrixWalletSignIn() {
    const { homeServer, loginStatus, setLoginStatus } = (0, use_matrix_store_1.useMatrixStore)();
    const { accounts, chainId, sign } = (0, use_web3_1.useWeb3Context)();
    const walletAddress = (0, react_1.useMemo)(() => (accounts && accounts.length > 0 ? accounts[0] : undefined), [accounts]);
    const authenticationError = (0, react_1.useCallback)(function (error) {
        setLoginStatus(login_1.LoginStatus.LoggedOut);
        console.error(error);
        return {
            isAuthenticated: false,
            error,
        };
    }, []);
    /**
     * This function does the following:
     * 1. Get login info from server like nonce.
     * 2. Generate a client nonce (cnonce)
     * 3. Create a hash from nonce + cnonce + other auth data
     * 4. Create a message for the user to sign. Hash from previous step is part of the message.
     * 5. Prompts the user to sign the message.
     * 6. Sends the signed message, cnonce, authData to the server.
     * 7. Verifies the server response.
     * 8. Saves the auth data locally (like the access token).
     */
    const loginWithWallet = (0, react_1.useCallback)(function (statementToSign) {
        return __awaiter(this, void 0, void 0, function* () {
            // Log in is allowed if the user is currently logged out.
            if (loginStatus === login_1.LoginStatus.LoggedOut) {
                if (walletAddress && chainId && homeServer) {
                    setLoginStatus(login_1.LoginStatus.LoggingIn);
                    // Todo: Get auth info (like nonce) from server.
                    const sessionResponse = getWalletLoginInfo({
                        walletAddress,
                        chainId,
                        homeServer,
                    });
                    console.log(`[loginWithWallet] got server response`, sessionResponse);
                    if (verifyServerResponse(sessionResponse)) {
                        const cnonce = generateNonce();
                        // Create the auth metadata for signing.
                        const authRequestData = ensureSpecCompliantAuthenticationData({
                            authority: sessionResponse.homeServer,
                            address: walletAddress,
                            statement: statementToSign,
                            uri: `${sessionResponse.homeServer}/login`,
                            version: "1",
                            chainId,
                            cnonce,
                            issuedAt: new Date(),
                        });
                        const hash = createHash({
                            nonce: sessionResponse.nonce,
                            authRequestData,
                        });
                        const messageToSign = createMessageToSign(authRequestData, hash);
                        // Prompt the user to sign the message.
                        const signature = yield sign(messageToSign, walletAddress);
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
                                    setLoginStatus(login_1.LoginStatus.LoggedIn);
                                    console.log(`[loginWithWallet] post auth processing done`);
                                    return {
                                        isAuthenticated: true,
                                    };
                                }
                                default:
                                    return authenticationError(`Authentication request failed with status: ${status}}`);
                            }
                        }
                        else {
                            return authenticationError(`Attempt to sign the login message failed!`);
                        }
                    }
                    else {
                        return authenticationError(`Request to start a new authentication session failed. ${sessionResponse.error}`);
                    }
                }
                else {
                    return authenticationError(`Missing information for logging in {
            walletAddress: ${walletAddress !== null && walletAddress !== void 0 ? walletAddress : "undefined"},
            chainId: ${chainId !== null && chainId !== void 0 ? chainId : "undefined"},
            homeServer: ${homeServer !== null && homeServer !== void 0 ? homeServer : "undefined"},
          }`);
                }
            }
            return {
                isAuthenticated: loginStatus === login_1.LoginStatus.LoggedIn,
            };
        });
    }, [chainId, homeServer, loginStatus, sign, walletAddress]);
    return {
        loginWithWallet,
    };
}
exports.useMatrixWalletSignIn = useMatrixWalletSignIn;
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
Hash: 32891756
Issued At: 2021-09-30T16:25:24Z
Resources:
- ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/
- https://example.com/my-web2-claim.json
 *
 */
function createMessageToSign(messageInfo, hash) {
    // See https://eips.ethereum.org/EIPS/eip-4361 for message template.
    // Change resources into the format:
    // - ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/
    // - https://example.com/my-web2-claim.json
    return `${messageInfo.authority} wants you to sign in with your wallet account:
${messageInfo.address}

${messageInfo.statement ? `${messageInfo.statement}\n` : ""}\nURI: ${messageInfo.uri}
Version: ${messageInfo.version}
Chain ID: ${messageInfo.chainId}
Hash: ${hash}
Issued At: ${messageInfo.issuedAt.toISOString()}${messageInfo.expirationTime
        ? `\nExpiration Time: ${messageInfo.expirationTime.toISOString()}`
        : ""}${messageInfo.notBefore
        ? `\nNot Before: ${messageInfo.notBefore.toISOString()}`
        : ""}${messageInfo.requestId ? `\nRequest ID: ${messageInfo.requestId}` : ""}${messageInfo.resources && messageInfo.resources.length > 0
        ? `\nResources:${messageInfo.resources
            .map((resource) => `\n- ${resource}`)
            .join("")}`
        : ""}`;
}
function getWalletLoginInfo(newSessionData) {
    const nonce = generateNonce();
    // Todo: get nonce from server.
    // Fake response from server.
    return {
        walletAddress: newSessionData.walletAddress,
        chainId: newSessionData.chainId,
        homeServer: newSessionData.homeServer,
        nonce,
    };
}
function generateNonce() {
    let nonce = "";
    if (isBrowser) {
        const nonceArray = new Uint8Array(16);
        window.crypto.getRandomValues(nonceArray);
        // Since this is going in the URL query string it needs to be URL safe
        nonce = js_base64_1.Base64.fromUint8Array(nonceArray, true);
    }
    return nonce;
}
function getAuthority(uri) {
    const url = new URL(uri);
    const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    return authority;
}
function verifyServerResponse(
// eslint-disable-next-line @typescript-eslint/no-unused-vars
response) {
    // Todo: verify server's response
    return true;
}
function ensureSpecCompliantAuthenticationData(authInput) {
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
    return Object.assign(Object.assign({}, authInput), { authority,
        statement,
        chainId });
}
function postAuthenticationRequest(
// eslint-disable-next-line @typescript-eslint/no-unused-vars
authRequest) {
    // Todo: Post auth request to the server;
    return http_status_codes_1.StatusCodes.OK;
}
function createHash(hashContent) {
    const content = `${hashContent.nonce}.${(0, fast_json_stable_stringify_1.default)(hashContent.authRequestData)}`;
    const hash = (0, keccak256_1.default)(content).toString("base64");
    return hash;
}
