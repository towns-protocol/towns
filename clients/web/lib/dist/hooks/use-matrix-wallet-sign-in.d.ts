import { LogInCompletedResponse } from "./login";
export declare function useMatrixWalletSignIn(): {
    loginWithWallet: (statementToSign: string) => Promise<LogInCompletedResponse>;
};
