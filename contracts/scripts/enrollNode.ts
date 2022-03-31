/* eslint-disable camelcase */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { NodeManager__factory } from "../../typechain-types/index";

async function main() {
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const nodeHash =
    "0xaa1acf32ea907a8945923aff29aa89cd352aa6c381c77e918457111479b15a8d";

  console.log(`params ${contractAddress} ${nodeHash}`);
  const [signer] = await ethers.getSigners();

  const nodeManager = NodeManager__factory.connect(contractAddress, signer);
  nodeManager.enrollNode(nodeHash);
  console.log("NodeManager enrollNode at:", nodeHash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
