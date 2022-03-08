"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatrixContextProvider = exports.MatrixContext = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const use_matrix_client_listener_1 = require("../hooks/use-matrix-client-listener");
const MATRIX_HOMESERVER_URL = (_a = process.env.MATRIX_HOME_SERVER) !== null && _a !== void 0 ? _a : "http://localhost:8008";
exports.MatrixContext = (0, react_1.createContext)(undefined);
function MatrixContextProvider({ children }) {
    const { matrixClient } = (0, use_matrix_client_listener_1.useMatrixClientListener)(MATRIX_HOMESERVER_URL);
    return ((0, jsx_runtime_1.jsx)(exports.MatrixContext.Provider, Object.assign({ value: matrixClient }, { children: children }), void 0));
}
exports.MatrixContextProvider = MatrixContextProvider;
