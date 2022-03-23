/* eslint-disable camelcase */
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { NodeManager, NodeManager__factory } from "../../typechain-types/index";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const NodeManagerFactory = (await ethers.getContractFactory(
    "NodeManager"
  )) as NodeManager__factory;
  const nodeManager = (await upgrades.deployProxy(NodeManagerFactory, [], {
    kind: "uups",
  })) as NodeManager;
  await nodeManager.deployed();
  console.log("NodeManager deployed to:", nodeManager.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
