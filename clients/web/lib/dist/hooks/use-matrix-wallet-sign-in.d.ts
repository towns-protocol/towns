import { LoginCompletedResponse as LoginCompletedResponse } from "./login";
export declare function useMatrixWalletSignIn(): {
    loginWithWallet: (statementToSign: string) => Promise<LoginCompletedResponse>;
};
