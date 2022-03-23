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
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMatrixClient = void 0;
const matrix_js_sdk_1 = require("matrix-js-sdk");
const login_1 = require("./login");
const react_1 = require("react");
const MatrixContextProvider_1 = require("../components/MatrixContextProvider");
const use_credential_store_1 = require("../store/use-credential-store");
const use_matrix_store_1 = require("../store/use-matrix-store");
const use_matrix_wallet_sign_in_1 = require("./use-matrix-wallet-sign-in");
/**
 * Matrix client API to interact with the Matrix server.
 */
function useMatrixClient() {
    const { homeServer, username, setDeviceId, setLogInStatus, setRoomName, setUserId, setUsername, } = (0, use_matrix_store_1.useMatrixStore)();
    const { setAccessToken } = (0, use_credential_store_1.useCredentialStore)();
    const matrixClient = (0, react_1.useContext)(MatrixContextProvider_1.MatrixContext);
    const { loginWithWallet } = (0, use_matrix_wallet_sign_in_1.useMatrixWalletSignIn)();
    const createRoom = (0, react_1.useCallback)(function (createInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (matrixClient) {
                    const options = {
                        //room_alias_name: "my_room_alias3",
                        visibility: createInfo.visibility,
                        name: createInfo.roomName,
                        is_direct: createInfo.isDirectMessage,
                    };
                    const response = yield matrixClient.createRoom(options);
                    console.log(`Created room`, JSON.stringify(response));
                    return response.room_id;
                }
                else {
                    console.error(`Not logged in. Cannot create room`);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (ex) {
                console.error(`Error creating room`, ex.stack);
            }
            return undefined;
        });
    }, []);
    const logout = (0, react_1.useCallback)(function () {
        return __awaiter(this, void 0, void 0, function* () {
            setLogInStatus(login_1.LogInStatus.LoggingOut);
            if (matrixClient) {
                try {
                    yield matrixClient.logout();
                    console.log(`Logged out`);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }
                catch (ex) {
                    console.error(`Error logging out:`, ex.stack);
                }
            }
            setLogInStatus(login_1.LogInStatus.LoggedOut);
            setAccessToken("");
        });
    }, []);
    const loginWithPassword = (0, react_1.useCallback)(function (username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            yield logout();
            setLogInStatus(login_1.LogInStatus.LoggingIn);
            const response = yield matrixLoginWithPassword(homeServer, username, password);
            if (response.accessToken) {
                setAccessToken(response.accessToken);
                setDeviceId(response.deviceId);
                setUserId(response.userId);
                setUsername((0, login_1.getUsernamePart)(response.userId));
                setLogInStatus(login_1.LogInStatus.LoggedIn);
            }
            else {
                setLogInStatus(login_1.LogInStatus.LoggedOut);
            }
            const isAuthenticated = response.accessToken ? true : false;
            return {
                isAuthenticated,
                error: response.error,
            };
        });
    }, [homeServer]);
    const registerNewUser = (0, react_1.useCallback)(function (username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            yield logout();
            setLogInStatus(login_1.LogInStatus.LoggingIn);
            const response = yield matrixRegisterUser(homeServer, username, password);
            if (response.accessToken) {
                setAccessToken(response.accessToken);
                setDeviceId(response.deviceId);
                setUserId(response.userId);
                setUsername((0, login_1.getUsernamePart)(response.userId));
                setLogInStatus(login_1.LogInStatus.LoggedIn);
            }
            const isAuthenticated = response.accessToken ? true : false;
            return {
                isAuthenticated,
                error: response.error,
            };
        });
    }, [homeServer]);
    const sendMessage = (0, react_1.useCallback)(function (roomId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (matrixClient) {
                const content = {
                    body: `${username}: ${message}`,
                    msgtype: "m.text",
                };
                yield matrixClient.sendEvent(roomId, "m.room.message", content, "", 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                function (err, res) {
                    if (err) {
                        console.error(err);
                    }
                });
            }
        });
    }, [username]);
    const leaveRoom = (0, react_1.useCallback)(function (roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (matrixClient) {
                yield matrixClient.leave(roomId);
                console.log(`Left room ${roomId}`);
            }
        });
    }, []);
    const inviteUser = (0, react_1.useCallback)(function (roomId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (matrixClient) {
                yield matrixClient.invite(roomId, userId, 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
                function (err, data) {
                    if (err) {
                        console.error(err);
                    }
                });
                console.log(`Invited user ${userId} to join room ${roomId}`);
            }
        });
    }, []);
    const joinRoom = (0, react_1.useCallback)(function (roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            const opts = {
                syncRoom: true,
            };
            try {
                if (matrixClient) {
                    yield matrixClient.joinRoom(roomId, opts);
                    console.log(`Joined room[${roomId}]`);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (ex) {
                console.error(`Error joining room[${roomId}]`, ex.stack);
            }
        });
    }, []);
    const syncRoom = (0, react_1.useCallback)(function (roomId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (matrixClient) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const roomNameEvent = yield matrixClient.getStateEvent(roomId, "m.room.name");
                    if (roomNameEvent === null || roomNameEvent === void 0 ? void 0 : roomNameEvent.name) {
                        setRoomName(roomId, roomNameEvent.name);
                    }
                    else {
                        console.log(`Querying "m.room.name" got nothing`);
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (ex) {
                console.error(`Error syncing room ${roomId}`, ex.stack);
            }
        });
    }, []);
    return {
        createRoom,
        inviteUser,
        joinRoom,
        leaveRoom,
        loginWithPassword,
        loginWithWallet,
        logout,
        registerNewUser,
        sendMessage,
        syncRoom,
    };
}
exports.useMatrixClient = useMatrixClient;
function matrixRegisterUser(homeServerUrl, username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let error;
        try {
            const newClient = (0, matrix_js_sdk_1.createClient)(homeServerUrl);
            const response = yield newClient.register(username, password, undefined, {
                type: "m.login.dummy",
                //type: "m.login.password",
            });
            console.log(`response:`, JSON.stringify(response));
            return {
                accessToken: response.access_token,
                deviceId: response.device_id,
                homeServer: response.home_server,
                userId: response.user_id,
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (ex) {
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
    });
}
function matrixLoginWithPassword(homeServerUrl, username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let error;
        try {
            const newClient = (0, matrix_js_sdk_1.createClient)(homeServerUrl);
            const response = yield newClient.loginWithPassword(username, password);
            //console.log(`response:`, JSON.stringify(response));
            return {
                accessToken: response.access_token,
                deviceId: response.device_id,
                homeServer: response.home_server,
                userId: response.user_id,
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (ex) {
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
    });
}
