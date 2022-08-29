import { network, ethers } from "hardhat";
import { DEVELOPMENT_CHAINS, VOTING_PERIOD } from "../helper-hardhat-config";
import { moveBlocks } from "../utils/move-blocks";

async function main(proposalIndex: number) {
  const chainId = network.config.chainId!.toString();
  console.log(`ChainId is ${chainId}`);

  const spaceName = "testspaceuno";
  const entitlementModule = await ethers.getContract(
    "UserGrantedEntitlementModule",
  );

  await createSpace(spaceName, entitlementModule.address);
}

export async function createSpace(
  spaceName: string,
  entitlementModuleAddress: string,
) {
  const zionSpaceManager = await ethers.getContract("ZionSpaceManager");

  const tx = await zionSpaceManager.createSpace(spaceName, [
    entitlementModuleAddress,
  ]);
  await tx.wait(1);

  if (DEVELOPMENT_CHAINS.includes(network.name)) {
    await moveBlocks(VOTING_PERIOD + 1);
  }
}

const index = 0;
main(index)
  .then(() => {
    console.log("Done creating space from main");
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
