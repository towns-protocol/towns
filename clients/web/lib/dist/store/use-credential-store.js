"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCredentialStore = void 0;
const zustand_1 = __importDefault(require("zustand"));
exports.useCredentialStore = (0, zustand_1.default)((set) => ({
    accessToken: null,
    setAccessToken: (accessToken) => set({ accessToken: accessToken !== null && accessToken !== void 0 ? accessToken : null }),
}));
