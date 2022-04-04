"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportsWalletLoginFlow = exports.isLoginFlow = exports.getShortUsername = exports.toLowerCaseUsername = exports.getUsernameFromId = exports.LoginStatus = exports.LoginTypeWallet = void 0;
exports.LoginTypeWallet = "m.login.wallet";
var LoginStatus;
(function (LoginStatus) {
    LoginStatus["LoggedIn"] = "LoggedIn";
    LoginStatus["LoggingIn"] = "LoggingIn";
    LoginStatus["LoggingOut"] = "LoggingOut";
    LoginStatus["LoggedOut"] = "LoggedOut";
    LoginStatus["Registering"] = "Registering";
})(LoginStatus = exports.LoginStatus || (exports.LoginStatus = {}));
function getUsernameFromId(userId) {
    var _a, _b;
    if (userId) {
        const regexName = /^@(?<username>\w+):/;
        const match = regexName.exec(userId);
        const username = (_b = (_a = match === null || match === void 0 ? void 0 : match.groups) === null || _a === void 0 ? void 0 : _a.username) !== null && _b !== void 0 ? _b : undefined;
        return username;
    }
    return undefined;
}
exports.getUsernameFromId = getUsernameFromId;
function getServernameFromId(userId) {
    var _a, _b;
    if (userId) {
        const regexName = /^@\w+:(?<servername>\w+)/;
        const match = regexName.exec(userId);
        const servername = (_b = (_a = match === null || match === void 0 ? void 0 : match.groups) === null || _a === void 0 ? void 0 : _a.servername) !== null && _b !== void 0 ? _b : undefined;
        return servername;
    }
    return undefined;
}
function toLowerCaseUsername(userId) {
    const username = getUsernameFromId(userId);
    const servername = getServernameFromId(userId);
    if (username && servername) {
        userId = `@${username.toLowerCase()}:${servername}`;
    }
    console.log(`toLowerCaseUsername() = ${userId}`);
    return userId;
}
exports.toLowerCaseUsername = toLowerCaseUsername;
function getShortUsername(userId) {
    // Wallet address starts with 0x.....
    if (userId && userId.startsWith("0x") && userId.length === 42) {
        const last4 = userId.length - 4;
        return `${userId.slice(0, 5)}....${userId.slice(last4)}`;
    }
    return userId;
}
exports.getShortUsername = getShortUsername;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLoginFlow(o) {
    return o.flows !== undefined;
}
exports.isLoginFlow = isLoginFlow;
function supportsWalletLoginFlow(loginFlows) {
    for (const f of loginFlows.flows) {
        for (const s of f.stages) {
            if (s === exports.LoginTypeWallet) {
                return true;
            }
        }
    }
    return false;
}
exports.supportsWalletLoginFlow = supportsWalletLoginFlow;
