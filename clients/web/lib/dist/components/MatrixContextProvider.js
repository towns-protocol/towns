"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatrixContextProvider = exports.MatrixContext = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const use_matrix_client_listener_1 = require("../hooks/use-matrix-client-listener");
exports.MatrixContext = (0, react_1.createContext)(undefined);
function MatrixContextProvider(props) {
    const { matrixClient } = (0, use_matrix_client_listener_1.useMatrixClientListener)(props.homeServerUrl);
    return ((0, jsx_runtime_1.jsx)(exports.MatrixContext.Provider, Object.assign({ value: matrixClient }, { children: props.children }), void 0));
}
exports.MatrixContextProvider = MatrixContextProvider;
