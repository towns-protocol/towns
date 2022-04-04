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
const matrix_js_sdk_1 = require("matrix-js-sdk");
const react_1 = require("react");
const http_status_codes_1 = require("http-status-codes");
const keccak256_1 = __importDefault(require("keccak256"));
const use_credential_store_1 = require("../store/use-credential-store");
const use_matrix_store_1 = require("../store/use-matrix-store");
const use_web3_1 = require("./use-web3");
function useMatrixWalletSignIn() {
    const { homeServer, loginStatus, setLoginError, setLoginStatus, setDeviceId, setUserId, setUsername, } = (0, use_matrix_store_1.useMatrixStore)();
    const { setAccessToken } = (0, use_credential_store_1.useCredentialStore)();
    const { accounts, chainId, sign } = (0, use_web3_1.useWeb3Context)();
    const walletAddress = (0, react_1.useMemo)(() => accounts && accounts.length > 0 ? accounts[0].toLowerCase() : undefined, [accounts]);
    const authenticationError = (0, react_1.useCallback)(function (error) {
        console.error(error.message);
        setLoginStatus(login_1.LoginStatus.LoggedOut);
        setLoginError(error);
    }, []);
    const authenticationSuccess = (0, react_1.useCallback)(function (response) {
        setAccessToken(response.access_token);
        setDeviceId(response.device_id);
        setUserId(response.user_id);
        setUsername((0, login_1.getUsernameFromId)(response.user_id));
        setLoginStatus(login_1.LoginStatus.LoggedIn);
    }, []);
    const signMessage = (0, react_1.useCallback)(function (sessionId, statementToSign) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[signMessage] start`);
            const { messageToSign, messageFields } = createMessageToSign({
                walletAddress,
                chainId,
                homeServer,
                nonce: sessionId,
                statementToSign,
            });
            // Prompt the user to sign the message.
            const signature = yield sign(messageToSign, walletAddress);
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
        });
    }, [chainId, homeServer, sign, walletAddress]);
    const getIsWalletIdRegistered = (0, react_1.useCallback)(function () {
        return __awaiter(this, void 0, void 0, function* () {
            if (homeServer && walletAddress) {
                const matrixClient = (0, matrix_js_sdk_1.createClient)(homeServer);
                try {
                    // isUsernameAvailable returns true if you can register
                    // a new account for that id.
                    const isAvailable = yield matrixClient.isUsernameAvailable(walletAddress);
                    // Not available means the id is registered
                    const isRegistered = isAvailable == false;
                    console.log(`[getWalletIdRegistered] ${isRegistered}`);
                    return isRegistered;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }
                catch (ex) {
                    console.error(ex.message);
                }
            }
            // Assumption: if wallet id is not available (free to register), then it is registered.
            console.log(`[getWalletIdRegistered] true`);
            return true;
        });
    }, [homeServer, walletAddress]);
    const createAndSignAuthData = (0, react_1.useCallback)(function (sessionId, statementToSign) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { signature, messageFields, message } = yield signMessage(sessionId, statementToSign);
                if (signature) {
                    // Send the signed message and auth data to the server.
                    const signedWalletData = {
                        message,
                        signature,
                        messageFields,
                    };
                    const auth = {
                        type: login_1.LoginTypeWallet,
                        session: sessionId,
                        signedWalletData,
                        walletAddress,
                    };
                    return auth;
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (ex) {
                console.error(ex.message);
            }
            return undefined;
        });
    }, [signMessage, walletAddress]);
    const registerWallet = (0, react_1.useCallback)(function (statementToSign) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[registerWallet] start`);
            // Registration of a new wallet is allowed if the user is currently logged out.
            if (loginStatus === login_1.LoginStatus.LoggedOut) {
                if (walletAddress && chainId && homeServer) {
                    // Signal to the UI that registration is in progress.
                    setLoginStatus(login_1.LoginStatus.Registering);
                    const matrixClient = (0, matrix_js_sdk_1.createClient)(homeServer);
                    try {
                        const { sessionId, error } = yield newRegisterSession(matrixClient, walletAddress);
                        if (!error && sessionId) {
                            // Prompt the user to sign the message.
                            const authData = yield createAndSignAuthData(sessionId, statementToSign);
                            const auth = {
                                type: login_1.LoginTypeWallet,
                                session: sessionId,
                                walletResponse: authData,
                            };
                            if (auth) {
                                // Send the signed message and auth data to the server.
                                try {
                                    const request = {
                                        auth,
                                        username: walletAddress,
                                    };
                                    console.log(`[registerWallet] sending registerRequest`, request);
                                    const response = yield matrixClient.registerRequest(request, login_1.LoginTypeWallet);
                                    console.log(`[registerWallet] received response from registerRequest`, response);
                                    if (response.access_token) {
                                        authenticationSuccess(response);
                                    }
                                    else {
                                        authenticationError({
                                            code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                                            message: `Attempt to register wallet ${walletAddress} failed!`,
                                        });
                                    }
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                }
                                catch (ex) {
                                    const error = ex;
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
                            }
                            else {
                                authenticationError({
                                    code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                                    message: `Attempt to sign the registration message failed!`,
                                });
                            }
                        }
                        else {
                            authenticationError({
                                code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                                message: `New registration session failed. Error: ${error}`,
                            });
                        }
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    }
                    catch (ex) {
                        authenticationError({
                            code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                            message: `Server error during wallet registration ${ex.message}`,
                        });
                    }
                }
                else {
                    authenticationError({
                        code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                        message: `Missing information for wallet registration {
                walletAddress: ${walletAddress !== null && walletAddress !== void 0 ? walletAddress : "undefined"},
                chainId: ${chainId !== null && chainId !== void 0 ? chainId : "undefined"},
                homeServer: ${homeServer !== null && homeServer !== void 0 ? homeServer : "undefined"},
              }`,
                    });
                }
            }
            console.log(`[registerWallet] end`);
        });
    }, [
        authenticationError,
        authenticationSuccess,
        chainId,
        createAndSignAuthData,
        homeServer,
        loginStatus,
        walletAddress,
    ]);
    const loginWithWallet = (0, react_1.useCallback)(function (statementToSign) {
        return __awaiter(this, void 0, void 0, function* () {
            // Login is allowed if the user is currently logged out.
            console.log(`[loginWithWallet] start`);
            if (loginStatus === login_1.LoginStatus.LoggedOut) {
                if (walletAddress && chainId && homeServer) {
                    // Signal to the UI that login is in progress.
                    setLoginStatus(login_1.LoginStatus.LoggingIn);
                    const matrixClient = (0, matrix_js_sdk_1.createClient)(homeServer);
                    try {
                        const isWalletSignInSupported = yield getWalletSignInSupported(matrixClient);
                        if (isWalletSignInSupported) {
                            const { sessionId, error } = yield newLoginSession(matrixClient);
                            if (!error && sessionId) {
                                // Prompt the user to sign the message.
                                const auth = yield createAndSignAuthData(sessionId, statementToSign);
                                if (auth) {
                                    // Send the signed message and auth data to the server.
                                    try {
                                        const response = yield matrixClient.login(login_1.LoginTypeWallet, {
                                            auth,
                                        });
                                        if (response.access_token) {
                                            authenticationSuccess(response);
                                        }
                                        else {
                                            authenticationError({
                                                code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                                                message: `Attempt to sign in failed!`,
                                            });
                                        }
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    }
                                    catch (ex) {
                                        const error = ex;
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
                                }
                                else {
                                    authenticationError({
                                        code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                                        message: `Attempt to sign the login message failed!`,
                                    });
                                }
                            }
                            else {
                                authenticationError({
                                    code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                                    message: `New login session failed. Error: ${error}`,
                                });
                            }
                        }
                        else {
                            authenticationError({
                                code: http_status_codes_1.StatusCodes.FORBIDDEN,
                                message: `Server does not support wallet sign in!`,
                            });
                        }
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    }
                    catch (ex) {
                        authenticationError({
                            code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                            message: `Server error during wallet sign in ${ex.message}`,
                        });
                    }
                }
                else {
                    authenticationError({
                        code: http_status_codes_1.StatusCodes.UNAUTHORIZED,
                        message: `Missing information for login {
                walletAddress: ${walletAddress !== null && walletAddress !== void 0 ? walletAddress : "undefined"},
                chainId: ${chainId !== null && chainId !== void 0 ? chainId : "undefined"},
                homeServer: ${homeServer !== null && homeServer !== void 0 ? homeServer : "undefined"},
              }`,
                    });
                }
            }
            console.log(`[loginWithWallet] end`);
        });
    }, [
        authenticationError,
        authenticationSuccess,
        chainId,
        createAndSignAuthData,
        homeServer,
        loginStatus,
        walletAddress,
    ]);
    return {
        getIsWalletIdRegistered,
        loginWithWallet,
        registerWallet,
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
function createMessageFromTemplate(messageInfo, hash) {
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
function getWalletSignInSupported(client) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get supported flows from the server.
        // loginFlows return type is wrong. Cast it to the expected type.
        const supportedFlows = (yield client.loginFlows());
        console.log(`Supported wallet login flows`, supportedFlows);
        return supportedFlows.flows.some((f) => f.type === login_1.LoginTypeWallet);
    });
}
function getAuthority(uri) {
    const url = new URL(uri);
    const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    return authority;
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
function createHash(messageFields) {
    const fieldStr = JSON.stringify(messageFields);
    const hash = (0, keccak256_1.default)(fieldStr).toString("base64");
    console.log(`createHash`, { hash, fieldStr });
    return hash;
}
function createMessageToSign(args) {
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
function newLoginSession(client) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[newLoginSession] start`);
        try {
            // According to the Client-Server API specm send a GET
            // request without arguments to start a new login session.
            yield client.login(login_1.LoginTypeWallet, {});
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (ex) {
            // https://spec.matrix.org/v1.2/client-server-api/#user-interactive-api-in-the-rest-api
            // Per spec, expect an exception with the session ID
            const error = ex;
            console.log(`[newLoginSession]`, {
                errcode: error.errcode,
                httpStatus: error.httpStatus,
                message: error.message,
                name: error.name,
                data: error.data,
            });
            if (
            // Expected 401
            error.httpStatus === http_status_codes_1.StatusCodes.UNAUTHORIZED &&
                (0, login_1.isLoginFlow)(error.data)) {
                const loginFlows = error.data;
                console.log(`[newLoginSession] Login session info`, loginFlows);
                return {
                    sessionId: loginFlows.session,
                };
            }
            else {
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
    });
}
function newRegisterSession(client, walletAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[newRegisterSession] start`);
        try {
            // https://spec.matrix.org/v1.2/client-server-api/#post_matrixclientv3register
            const requestData = {
                auth: { type: login_1.LoginTypeWallet },
                username: walletAddress,
            };
            yield client.registerRequest(requestData, login_1.LoginTypeWallet);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (ex) {
            // https://spec.matrix.org/v1.2/client-server-api/#user-interactive-api-in-the-rest-api
            // Per spec, expect an exception with the session ID
            const error = ex;
            console.log(`[newRegisterSession]`, {
                errcode: error.errcode,
                httpStatus: error.httpStatus,
                message: error.message,
                name: error.name,
                data: error.data,
            });
            if (
            // Expected 401
            error.httpStatus === http_status_codes_1.StatusCodes.UNAUTHORIZED &&
                (0, login_1.isLoginFlow)(error.data)) {
                const loginFlows = error.data;
                console.log(`[newRegisterSession] Register session info`, loginFlows);
                return {
                    sessionId: loginFlows.session,
                };
            }
            else {
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
    });
}
