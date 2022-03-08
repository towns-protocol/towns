"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCredentialStore = void 0;
const zustand_1 = require("zustand");
exports.useCredentialStore = (0, zustand_1.default)((set) => ({
    accessToken: null,
    setAccessToken: (accessToken) => set({ accessToken: accessToken !== null && accessToken !== void 0 ? accessToken : null }),
}));
