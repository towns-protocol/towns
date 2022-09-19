import { useCallback } from "react";
import { ethers } from "ethers";
import { useAccount, useNetwork, useSignMessage } from "wagmi";
import { IWeb3Context } from "../../components/Web3ContextProvider";
import { WalletStatus } from "types/web3-types";

/// web3 grabs some of the wagmi data for convience, please feel free to use wagmi directly
export function useWeb3(): IWeb3Context {
  const { address, connector, isConnected, status } = useAccount();
  const { chain: activeChain, chains } = useNetwork();
  const { signMessageAsync } = useSignMessage();

  console.log("use web3", {
    connector,
    address,
    activeChain,
    rpc: activeChain?.rpcUrls,
    def: activeChain?.rpcUrls?.default,
    status,
  });

  const sign = useCallback(
    async (
      message: string,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      walletAddress: string,
    ): Promise<string | undefined> => {
      return signMessageAsync({ message });
    },
    [signMessageAsync],
  );

  const getProviderCB = useCallback(() => {
    // AELLIS 8/17/21, i couldn't figure out how to get the provider from wagmi to play nice
    // with the provider from ethers (weird because wagmi uses ethers under the hood)
    // just grabbing the window.ethereum like a caveman for now, it should be the same
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && window?.ethereum) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return new ethers.providers.Web3Provider(window.ethereum);
    }
    return undefined;
  }, []);

  return {
    getProvider: getProviderCB,
    sign: sign,
    accounts: address ? [address] : [],
    chain: activeChain,
    chains: chains,
    isConnected: isConnected,
    walletStatus: status as WalletStatus,
  };
}
