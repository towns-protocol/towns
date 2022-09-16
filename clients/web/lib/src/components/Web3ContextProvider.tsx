import React, { createContext, useContext } from "react";
import { ethers } from "ethers";
import { WalletStatus } from "../types/web3-types";
import { useWeb3 } from "../hooks/use-web3";

export interface IWeb3Context {
  getProvider: () => ethers.providers.Web3Provider | undefined;
  providerInstalled: boolean;
  requestAccounts: () => Promise<
    | {
        accounts: string[];
        chainId: string;
      }
    | {
        accounts: never[];
        chainId: undefined;
      }
  >;
  sign: (message: string, walletAddress: string) => Promise<string | undefined>;
  accounts: string[];
  chainId: string | undefined;
  walletStatus: WalletStatus;
}

export const Web3Context = createContext<IWeb3Context | undefined>(undefined);

export function useWeb3Context(): IWeb3Context {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3Context must be used in a Web3ContextProvider");
  }
  return context;
}

interface Props {
  children: JSX.Element;
}

export function Web3ContextProvider(props: Props): JSX.Element {
  const web3 = useWeb3();
  return (
    <Web3Context.Provider value={web3}>{props.children}</Web3Context.Provider>
  );
}
