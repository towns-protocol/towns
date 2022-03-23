"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGenericContext = void 0;
const react_1 = require("react");
const createGenericContext = () => {
    // Create a context with a generic parameter or undefined
    const genericContext = (0, react_1.createContext)(undefined);
    // Check if the value provided to the context is defined or throw an error
    const useGenericContext = () => {
        const contextIsDefined = (0, react_1.useContext)(genericContext);
        if (!contextIsDefined) {
            throw new Error("useGenericContext must be used within a Provider");
        }
        return contextIsDefined;
    };
    return [useGenericContext, genericContext.Provider];
};
exports.createGenericContext = createGenericContext;
