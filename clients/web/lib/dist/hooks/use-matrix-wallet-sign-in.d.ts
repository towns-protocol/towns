export declare function useMatrixWalletSignIn(): {
    getIsWalletIdRegistered: () => Promise<boolean>;
    loginWithWallet: (statementToSign: string) => Promise<void>;
    registerWallet: (statementToSign: string) => Promise<void>;
};
