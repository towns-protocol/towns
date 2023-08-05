import { CouncilNFT, ZionSpaceManager } from "@towns/generated/governance";
import { AppserviceConfig } from "./AppserviceConfig";
import { ZionContractProvider } from "./contracts/ZionContractProvider";
import { ethers } from "ethers";
import { zionCouncilNFTAbi, zionSpaceManagerAbi } from "./contracts/ZionAbis";

interface ZionContracts {
  councilNFTContract: ZionContractProvider<CouncilNFT>;
  spaceManagerContract: ZionContractProvider<ZionSpaceManager>;
}

interface Contracts {
  [networkId: number]: ZionContracts;
}

export class BlockchainProviders {
  private contracts: Contracts;
  private config: AppserviceConfig;

  constructor(config: AppserviceConfig) {
    this.contracts = {};
    this.config = config;
  }

  public getCouncilNFTContract(
    networkId: number
  ): ZionContractProvider<CouncilNFT> | undefined {
    const contract = this.getContractsByNetworkId(networkId);
    return contract?.councilNFTContract;
  }

  public getZionSpaceManagerContract(
    networkId: number
  ): ZionContractProvider<ZionSpaceManager> | undefined {
    const contract = this.getContractsByNetworkId(networkId);
    return contract?.spaceManagerContract;
  }

  private getContractsByNetworkId(
    networkId: number
  ): ZionContracts | undefined {
    let provider: ethers.providers.Provider;

    if (!this.contracts[networkId]) {
      switch (networkId) {
        case 31337:
        case 1337: {
          provider = new ethers.providers.JsonRpcProvider(
            "http://localhost:8545"
          );
          break;
        }
        default: {
          provider = new ethers.providers.InfuraProvider(
            networkId,
            this.config.web3ProviderKey
          );
          break;
        }
      }
      if (provider) {
        const spaceManagerContract = new ZionContractProvider<ZionSpaceManager>(
          this.config.zionSpaceManagerAddress,
          zionSpaceManagerAbi(),
          provider
        );
        const councilNFTContract = new ZionContractProvider<CouncilNFT>(
          this.config.councilNFTAddress,
          zionCouncilNFTAbi(),
          provider
        );
        this.contracts[networkId] = {
          councilNFTContract,
          spaceManagerContract,
        };
      }
    }
    return this.contracts[networkId];
  }
}
