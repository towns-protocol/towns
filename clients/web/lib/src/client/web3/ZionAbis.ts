import ZionSpaceManagerArtifact from "@harmony/contracts/governance/artifacts/ZionSpaceManager.json";
import { ethers } from "ethers";

export function zionSpaceManagerAbi(): ethers.ContractInterface {
  if (ZionSpaceManagerArtifact) {
    return ZionSpaceManagerArtifact.abi;
  }
  // we have an issue in the tests where the import declared above is undefined... this is a hack to get around it
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
  return require("@harmony/contracts/governance/artifacts/ZionSpaceManager.json")
    .abi;
}

