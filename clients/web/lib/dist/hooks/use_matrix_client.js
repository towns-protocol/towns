import { createClient, } from "matrix-js-sdk";
import { useCallback, useEffect, useRef } from "react";
import { useStore } from "../store/store";
const MATRIX_HOMESERVER_URL = process.env.MATRIX_HOME_SERVER ?? "http://localhost:8008";
export function useMatrixClient() {
    const { accessToken, homeServer, isAuthenticated, userId, username, setAccessToken, setDeviceId, setHomeServer, setIsAuthenticated, setUserId, setUsername, } = useStore();
    const matrixClientRef = useRef();
    useEffect(function () {
        if (isAuthenticated) {
            if (accessToken && homeServer && userId) {
                const options = {
                    baseUrl: homeServer,
                    accessToken: accessToken,
                    userId: userId,
                };
                matrixClientRef.current = createClient(options);
            }
        }
        else {
            matrixClientRef.current = null;
        }
    }, [accessToken, homeServer, isAuthenticated, userId]);
    const createRoom = useCallback(async function (createInfo) {
        try {
            if (matrixClientRef.current) {
                const options = {
                    //room_alias_name: "my_room_alias3",
                    visibility: createInfo.visibility,
                    name: createInfo.roomName,
                    is_direct: createInfo.isDirectMessage,
                };
                const response = await matrixClientRef.current.createRoom(options);
                console.log(`Created room`, JSON.stringify(response));
                return response.room_id;
            }
            else {
                console.error(`Not logged in. Cannot create room`);
            }
        }
        catch (ex) {
            console.error(`Error creating room`, ex.stack);
        }
        return undefined;
    }, []);
    const logout = useCallback(async function () {
        if (accessToken) {
            await matrixLogout(MATRIX_HOMESERVER_URL, accessToken);
        }
        setIsAuthenticated(false);
    }, [accessToken, setIsAuthenticated]);
    const loginWithPassword = useCallback(async function (username, password) {
        await logout();
        const response = await matrixLoginWithPassword(MATRIX_HOMESERVER_URL, username, password);
        if (response.accessToken) {
            setAccessToken(response.accessToken);
            setDeviceId(response.deviceId);
            setHomeServer(getHomeServerUrl(response.homeServer));
            setUserId(response.userId);
            setUsername(getUserNamePart(response.userId));
            setIsAuthenticated(true);
        }
        return response;
    }, [
        logout,
        setAccessToken,
        setDeviceId,
        setHomeServer,
        setIsAuthenticated,
        setUserId,
        setUsername,
    ]);
    const registerNewUser = useCallback(async function (username, password) {
        await logout();
        const response = await matrixRegisterUser(MATRIX_HOMESERVER_URL, username, password);
        if (response.accessToken) {
            setAccessToken(response.accessToken);
            setDeviceId(response.deviceId);
            setHomeServer(getHomeServerUrl(response.homeServer));
            setUserId(response.userId);
            setUsername(getUserNamePart(response.userId));
            setIsAuthenticated(true);
        }
        return response;
    }, [
        logout,
        setAccessToken,
        setDeviceId,
        setHomeServer,
        setIsAuthenticated,
        setUserId,
        setUsername,
    ]);
    const sendMessage = useCallback(async function (roomId, message) {
        if (matrixClientRef.current) {
            const content = {
                body: `${username}: ${message}`,
                msgtype: "m.text",
            };
            await matrixClientRef.current.sendEvent(roomId, "m.room.message", content, "", function (err, res) {
                if (err) {
                    console.error(err);
                }
            });
        }
    }, [username]);
    const leaveRoom = useCallback(async function (roomId) {
        if (matrixClientRef.current) {
            await matrixClientRef.current.leave(roomId);
            console.log(`Left room ${roomId}`);
        }
    }, []);
    const inviteUser = useCallback(async function (roomId, userId) {
        if (matrixClientRef.current) {
            await matrixClientRef.current.invite(roomId, userId, function (err, data) {
                if (err) {
                    console.error(err);
                }
            }, "Please join me for a discussion");
            console.log(`Invited user ${userId} to join room ${roomId}`);
        }
    }, []);
    const joinRoom = useCallback(async function (roomId) {
        const opts = {
            syncRoom: true,
        };
        try {
            if (matrixClientRef.current) {
                await matrixClientRef.current.joinRoom(roomId, opts);
                console.log(`Joined room[${roomId}]`);
            }
        }
        catch (ex) {
            console.error(`Error joining room[${roomId}]`, ex.stack);
        }
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
function getUserNamePart(userId) {
    if (userId) {
        const regexName = /^@(?<name>\w+):/;
        const match = regexName.exec(userId);
        const username = match?.groups?.name ?? undefined;
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
async function matrixRegisterUser(homeServerUrl, username, password) {
    let error;
    try {
        const newClient = createClient(homeServerUrl);
        const response = await newClient.register(username, password, null, {
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
}
async function matrixLoginWithPassword(homeServerUrl, username, password) {
    let error;
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
}
async function matrixLogout(homeServerUrl, accessToken) {
    const options = {
        baseUrl: homeServerUrl,
        accessToken,
    };
    try {
        const newClient = createClient(options);
        await newClient.logout();
        console.log(`Logged out`);
    }
    catch (ex) {
        console.error(`Error logging out:`, ex.stack);
    }
}
