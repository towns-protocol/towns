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
exports.matrixLoginWithPassword = exports.matrixRegisterUser = exports.getUserNamePart = exports.LogInStatus = void 0;
const matrix_js_sdk_1 = require("matrix-js-sdk");
var LogInStatus;
(function (LogInStatus) {
    LogInStatus["LoggedIn"] = "LoggedIn";
    LogInStatus["LoggingIn"] = "LoggingIn";
    LogInStatus["LoggingOut"] = "LoggingOut";
    LogInStatus["LoggedOut"] = "LoggedOut";
})(LogInStatus = exports.LogInStatus || (exports.LogInStatus = {}));
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
exports.getUserNamePart = getUserNamePart;
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
exports.matrixRegisterUser = matrixRegisterUser;
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
exports.matrixLoginWithPassword = matrixLoginWithPassword;
