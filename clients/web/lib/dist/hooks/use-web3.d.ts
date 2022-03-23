import { ReactNode } from "react";
export declare enum WalletStatus {
    Unknown = "Unknown",
    RequestUnlock = "RequestUnlock",
    StillRequestingUnlock = "StillRequestingUnlock",
    Unlocked = "Unlocked",
    Error = "Error"
}
declare const useWeb3Context: () => {
    readonly providerInstalled: boolean;
    readonly requestAccounts: () => Promise<{
        accounts: string[];
        chainId: string;
    }>;
    readonly sign: (message: string, walletAddress: string) => Promise<string | undefined>;
    readonly ecRecover: (message: string, signature: string) => Promise<string | undefined>;
    readonly accounts: string[];
    readonly chainId: string;
    readonly walletStatus: WalletStatus;
};
declare const Web3Provider: ({ children }: {
    children: ReactNode;
}) => JSX.Element;
export { useWeb3Context, Web3Provider };
export declare type RequestAccounts = ReturnType<typeof useWeb3>["requestAccounts"];
export declare type UseWeb3 = ReturnType<typeof useWeb3>;
declare function useWeb3(): {
    readonly providerInstalled: boolean;
    readonly requestAccounts: () => Promise<{
        accounts: string[];
        chainId: string;
    }>;
    readonly sign: (message: string, walletAddress: string) => Promise<string | undefined>;
    readonly ecRecover: (message: string, signature: string) => Promise<string | undefined>;
    readonly accounts: string[];
    readonly chainId: string;
    readonly walletStatus: WalletStatus;
};
