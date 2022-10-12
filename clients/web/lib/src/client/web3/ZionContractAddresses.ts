/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import MainNet_SpaceManager from "@harmony/contracts/mainnet/addresses/space-manager.json";
import MainNet_Council from "@harmony/contracts/mainnet/addresses/council.json";
import Goerli_SpaceManager from "@harmony/contracts/goerli/addresses/space-manager.json";
import Goerli_Council from "@harmony/contracts/goerli/addresses/council.json";
import Foundry_SpaceManager from "@harmony/contracts/localhost/addresses/space-manager.json";
import Foundry_Council from "@harmony/contracts/localhost/addresses/council.json";

export interface ISpaceManagerAddress {
  spacemanager: string;
  usergranted: string;
  tokengranted: string;
}

export interface ICouncilAddress {
  councilnft: string;
}

export interface IContractAddresses {
  spaceManager: ISpaceManagerAddress;
  council: ICouncilAddress;
}

const emptySMAddresses: ISpaceManagerAddress = {
  spacemanager: "",
  usergranted: "",
  tokengranted: "",
};

const emptyCouncilAddresses: ICouncilAddress = {
  councilnft: "",
};

/// get zion contract addresses for a given network id
/// aellis 2021-09-09,
/// map chainId to json
export function getContractAddresses(chainId: number): IContractAddresses {
  switch (chainId) {
    case 1:
      return {
        spaceManager: MainNet_SpaceManager,
        council: MainNet_Council,
      };
    case 5:
      return {
        spaceManager: Goerli_SpaceManager,
        council: Goerli_Council,
      };
    case 1337:
    case 31337:
      return {
        spaceManager: Foundry_SpaceManager,
        council: Foundry_Council,
      };
    default:
      if (chainId !== 0) {
        console.error(
          `Unsupported chainId, please add chainId: ${chainId} info to ZionContractAddresses.ts`,
        );
      }
      return {
        spaceManager: emptySMAddresses,
        council: emptyCouncilAddresses,
      };
  }
}
