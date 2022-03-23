"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletSignIn = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const use_matrix_wallet_sign_in_1 = require("../hooks/use-matrix-wallet-sign-in");
function WalletSignIn() {
    (0, use_matrix_wallet_sign_in_1.useMatrixWalletSignIn)();
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {}, void 0);
}
exports.WalletSignIn = WalletSignIn;
