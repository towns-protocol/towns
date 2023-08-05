import ZionSpaceManagerArtifact from "@towns/generated/governance/artifacts/ZionSpaceManager.json";
import CouncilNFTArtifact from "@towns/generated/governance/artifacts/CouncilNFT.json";
import CouncilStakingArtifact from "@towns/generated/governance/artifacts/CouncilStaking.json";
import { ethers } from "ethers";

export function zionSpaceManagerAbi(): ethers.ContractInterface {
  if (ZionSpaceManagerArtifact) {
    return ZionSpaceManagerArtifact.abi;
  }
  // we have an issue in the tests where the import declared above is undefined... this is a hack to get around it
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
  return require("@towns/generated/governance/artifacts/ZionSpaceManager.json")
    .abi;
}

export function zionCouncilNFTAbi(): ethers.ContractInterface {
  if (CouncilNFTArtifact) {
    return CouncilNFTArtifact.abi;
  }
  // we have an issue in the tests where the import declared above is undefined... this is a hack to get around it
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
  return require("@towns/generated/governance/artifacts/CouncilNFT.json").abi;
}

export function zionCouncilStakingAbi(): ethers.ContractInterface {
  if (CouncilStakingArtifact) {
    return CouncilStakingArtifact.abi;
  }
  // we have an issue in the tests where the import declared above is undefined... this is a hack to get around it
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
  return require("@towns/generated/governance/artifacts/CouncilStaking.json")
    .abi;
}
