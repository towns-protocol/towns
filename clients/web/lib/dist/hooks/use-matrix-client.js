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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMatrixClient = void 0;
const matrix_js_sdk_1 = require("matrix-js-sdk");
const react_1 = require("react");
const store_1 = require("../store/store");
const MATRIX_HOMESERVER_URL = (_a = process.env.MATRIX_HOME_SERVER) !== null && _a !== void 0 ? _a : "http://localhost:8008";
function useMatrixClient() {
    const { accessToken, homeServer, isAuthenticated, userId, username, setAccessToken, setDeviceId, setHomeServer, setIsAuthenticated, setUserId, setUsername, } = (0, store_1.useMatrixStore)();
    const matrixClientRef = (0, react_1.useRef)();
    (0, react_1.useEffect)(function () {
        if (isAuthenticated) {
            if (accessToken && homeServer && userId) {
                const options = {
                    baseUrl: homeServer,
                    accessToken: accessToken,
                    userId: userId,
                };
                matrixClientRef.current = (0, matrix_js_sdk_1.createClient)(options);
            }
        }
        else {
            matrixClientRef.current = null;
        }
    }, [accessToken, homeServer, isAuthenticated, userId]);
    const createRoom = (0, react_1.useCallback)(function (createInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (matrixClientRef.current) {
                    const options = {
                        //room_alias_name: "my_room_alias3",
                        visibility: createInfo.visibility,
                        name: createInfo.roomName,
                        is_direct: createInfo.isDirectMessage,
                    };
                    const response = yield matrixClientRef.current.createRoom(options);
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
            if (accessToken) {
                yield matrixLogout(MATRIX_HOMESERVER_URL, accessToken);
            }
            setIsAuthenticated(false);
        });
    }, [accessToken, setIsAuthenticated]);
    const loginWithPassword = (0, react_1.useCallback)(function (username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            yield logout();
            const response = yield matrixLoginWithPassword(MATRIX_HOMESERVER_URL, username, password);
            if (response.accessToken) {
                setAccessToken(response.accessToken);
                setDeviceId(response.deviceId);
                setHomeServer(getHomeServerUrl(response.homeServer));
                setUserId(response.userId);
                setUsername(getUserNamePart(response.userId));
                setIsAuthenticated(true);
            }
            return response;
        });
    }, [
        logout,
        setAccessToken,
        setDeviceId,
        setHomeServer,
        setIsAuthenticated,
        setUserId,
        setUsername,
    ]);
    const registerNewUser = (0, react_1.useCallback)(function (username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            yield logout();
            const response = yield matrixRegisterUser(MATRIX_HOMESERVER_URL, username, password);
            if (response.accessToken) {
                setAccessToken(response.accessToken);
                setDeviceId(response.deviceId);
                setHomeServer(getHomeServerUrl(response.homeServer));
                setUserId(response.userId);
                setUsername(getUserNamePart(response.userId));
                setIsAuthenticated(true);
            }
            return response;
        });
    }, [
        logout,
        setAccessToken,
        setDeviceId,
        setHomeServer,
        setIsAuthenticated,
        setUserId,
        setUsername,
    ]);
    const sendMessage = (0, react_1.useCallback)(function (roomId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (matrixClientRef.current) {
                const content = {
                    body: `${username}: ${message}`,
                    msgtype: "m.text",
                };
                yield matrixClientRef.current.sendEvent(roomId, "m.room.message", content, "", 
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
            if (matrixClientRef.current) {
                yield matrixClientRef.current.leave(roomId);
                console.log(`Left room ${roomId}`);
            }
        });
    }, []);
    const inviteUser = (0, react_1.useCallback)(function (roomId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (matrixClientRef.current) {
                yield matrixClientRef.current.invite(roomId, userId, 
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
                if (matrixClientRef.current) {
                    yield matrixClientRef.current.joinRoom(roomId, opts);
                    console.log(`Joined room[${roomId}]`);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (ex) {
                console.error(`Error joining room[${roomId}]`, ex.stack);
            }
        });
    }, []);
    return {
        createRoom,
        inviteUser,
        joinRoom,
        leaveRoom,
        loginWithPassword,
        logout,
        registerNewUser,
        sendMessage,
    };
}
exports.useMatrixClient = useMatrixClient;
function getUserNamePart(userId) {
    var _a, _b;
    if (userId) {
        const regexName = /^@(?<name>\w+):/;
        const match = regexName.exec(userId);
        const username = (_b = (_a = match === null || match === void 0 ? void 0 : match.groups) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : undefined;
        return username;
    }
    return undefined;
}
function getHomeServerUrl(homeServer) {
    if (homeServer) {
        if (homeServer.startsWith("http://") || homeServer.startsWith("https://")) {
            return homeServer;
        }
        else {
            return `http://${homeServer}`;
        }
    }
    return undefined;
}
function matrixRegisterUser(homeServerUrl, username, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let error;
        try {
            const newClient = (0, matrix_js_sdk_1.createClient)(homeServerUrl);
            const response = yield newClient.register(username, password, undefined, {
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
function matrixLogout(homeServerUrl, accessToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const options = {
            baseUrl: homeServerUrl,
            accessToken,
        };
        try {
            const newClient = (0, matrix_js_sdk_1.createClient)(options);
            yield newClient.logout();
            console.log(`Logged out`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (ex) {
            console.error(`Error logging out:`, ex.stack);
        }
    });
}
