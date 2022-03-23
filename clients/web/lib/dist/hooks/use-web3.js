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
exports.Web3Provider = exports.useWeb3Context = exports.WalletStatus = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const create_generic_context_1 = require("../utils/create-generic-context");
const logger_1 = require("../utils/logger");
var WalletStatus;
(function (WalletStatus) {
    WalletStatus["Unknown"] = "Unknown";
    WalletStatus["RequestUnlock"] = "RequestUnlock";
    WalletStatus["StillRequestingUnlock"] = "StillRequestingUnlock";
    WalletStatus["Unlocked"] = "Unlocked";
    WalletStatus["Error"] = "Error";
})(WalletStatus = exports.WalletStatus || (exports.WalletStatus = {}));
const [useWeb3Context, Web3ContextProvider] = (0, create_generic_context_1.createGenericContext)();
exports.useWeb3Context = useWeb3Context;
const Web3Provider = ({ children }) => {
    const web3 = useWeb3();
    return (0, jsx_runtime_1.jsx)(Web3ContextProvider, Object.assign({ value: web3 }, { children: children }), void 0);
};
exports.Web3Provider = Web3Provider;
function useWeb3() {
    const [accounts, setAccounts] = (0, react_1.useState)([]);
    const [chainId, setChainId] = (0, react_1.useState)();
    const messageId = (0, react_1.useRef)(0);
    const requestingAccounts = (0, react_1.useRef)(false);
    const connectingWalletTimeout = (0, react_1.useRef)();
    (0, react_1.useEffect)(() => {
        if (connectingWalletTimeout.current) {
            clearTimeout(connectingWalletTimeout.current);
            connectingWalletTimeout.current = undefined;
        }
    }, []);
    const [walletStatus, setWalletStatus] = (0, react_1.useState)(WalletStatus.Unknown);
    const [ethereum] = (0, react_1.useState)(() => {
        if (typeof window !== "undefined" && (window === null || window === void 0 ? void 0 : window.ethereum)) {
            return window.ethereum;
        }
        else {
            return false;
        }
    });
    const getAccounts = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        const accounts = yield ethereum.request({
            jsonrpc: "2.0",
            id: messageId.current++,
            method: "eth_accounts",
            params: [],
        });
        return accounts;
    }), [ethereum]);
    const getChainId = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        const chainId = yield ethereum.request({
            jsonrpc: "2.0",
            id: messageId.current++,
            method: "eth_chainId",
            params: [],
        });
        return chainId;
    }), [ethereum]);
    const providerInstalled = (0, react_1.useMemo)(() => Boolean(ethereum), [ethereum]);
    (0, react_1.useEffect)(() => {
        let shutdown = false;
        if (ethereum) {
            const onAccountsChanged = (accounts) => {
                if (!shutdown) {
                    // If the wallet is unlocked, get the accounts
                    logger_1.logger.info(`onAccountsChanged: ${accounts.join(":")} accounts.length ${accounts.length}`);
                    setAccounts((oldAccounts) => oldAccounts &&
                        oldAccounts.length === accounts.length &&
                        oldAccounts.every((oldAccount) => accounts.some((account) => account === oldAccount))
                        ? oldAccounts
                        : accounts);
                    if (accounts.length > 0) {
                        setWalletStatus(WalletStatus.Unlocked);
                    }
                    else {
                        setWalletStatus(WalletStatus.Unknown);
                    }
                }
            };
            const onChainChanged = (chainId) => {
                if (!shutdown) {
                    // If the wallet is unlocked, get the chainId
                    logger_1.logger.info(`chainId: ${chainId}`);
                    setChainId(chainId);
                }
            };
            ethereum.on("accountsChanged", onAccountsChanged);
            ethereum.on("chainChanged", onChainChanged);
            void (() => __awaiter(this, void 0, void 0, function* () {
                const [accounts, chainId] = yield Promise.all([
                    getAccounts(),
                    getChainId(),
                ]);
                if (!shutdown) {
                    setChainId(chainId);
                    setAccounts((oldAccounts) => oldAccounts &&
                        oldAccounts.length === accounts.length &&
                        oldAccounts.every((oldAccount) => accounts.some((account) => account === oldAccount))
                        ? oldAccounts
                        : accounts);
                    if (accounts.length > 0) {
                        setWalletStatus(WalletStatus.Unlocked);
                    }
                    else {
                        setWalletStatus(WalletStatus.Unknown);
                    }
                }
            }))();
            return () => {
                shutdown = true;
                ethereum.removeListener("accountsChanged", onAccountsChanged);
                ethereum.removeListener("chainChanged", onChainChanged);
            };
        }
    }, [ethereum, getAccounts, getChainId]);
    const requestAccounts = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.info(`requestAccounts`);
        if (!requestingAccounts.current) {
            try {
                requestingAccounts.current = true;
                connectingWalletTimeout.current = setTimeout(() => {
                    setWalletStatus(WalletStatus.StillRequestingUnlock);
                    logger_1.logger.info(`fired StillRequestUnlocked`);
                }, 15 * 1000);
                setWalletStatus(WalletStatus.RequestUnlock);
                // If the wallet is locked this will show the connect wallet dialouge and request the user unlock the wallet
                const accounts = yield ethereum.request({
                    jsonrpc: "2.0",
                    id: messageId.current++,
                    method: "eth_requestAccounts",
                    params: [],
                });
                const chainId = yield getChainId();
                logger_1.logger.info(`requestAccounts ${JSON.stringify({ accounts, chainId })}`);
                setChainId(chainId);
                setAccounts((oldAccounts) => oldAccounts &&
                    oldAccounts.length === accounts.length &&
                    oldAccounts.every((oldAccount) => accounts.some((account) => account === oldAccount))
                    ? oldAccounts
                    : accounts);
                if (accounts.length > 0) {
                    setWalletStatus(WalletStatus.Unlocked);
                }
                else {
                    setWalletStatus(WalletStatus.Unknown);
                }
                return { accounts, chainId };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (error) {
                logger_1.logger.error(`Error requesting eth_requestAccounts: ${error.message}. Code: ${error.code}. Data: ${error.data}`);
                setWalletStatus(WalletStatus.Error);
                return { accounts: [], chainId: undefined };
            }
            finally {
                requestingAccounts.current = false;
                if (connectingWalletTimeout.current) {
                    clearTimeout(connectingWalletTimeout.current);
                    connectingWalletTimeout.current = undefined;
                }
            }
        }
        else {
            return { accounts: [], chainId: undefined };
        }
    }), [ethereum, getChainId]);
    const ecRecover = (0, react_1.useCallback)((message, signature) => __awaiter(this, void 0, void 0, function* () {
        try {
            const signingWallet = yield ethereum.request({
                jsonrpc: "2.0",
                id: messageId.current++,
                method: "personal_ecRecover",
                params: [message, signature],
            });
            logger_1.logger.info(`personal_ecRecover:\n${signingWallet}`);
            return signingWallet;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (error) {
            logger_1.logger.error(`Error requesting personal_ecRecover: ${error.message}.
       Code: ${error.code}. Data: ${error.data}`);
        }
    }), [ethereum]);
    const sign = (0, react_1.useCallback)((message, walletAddress) => __awaiter(this, void 0, void 0, function* () {
        try {
            const signature = yield ethereum.request({
                jsonrpc: "2.0",
                id: messageId.current++,
                method: "personal_sign",
                params: [message, walletAddress, ""],
            });
            logger_1.logger.info(`personal_sign:\n${signature}`);
            return signature;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (error) {
            logger_1.logger.error(`Error requesting personal_sign: ${error.message}.
       Code: ${error.code}. Data: ${error.data}`);
        }
    }), [ethereum]);
    return {
        providerInstalled,
        requestAccounts,
        sign,
        ecRecover,
        accounts,
        chainId,
        walletStatus,
    };
}
