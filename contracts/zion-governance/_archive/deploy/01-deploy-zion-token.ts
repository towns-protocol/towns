import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
// import { networkConfig, developmentChains } from '../helper-hardhat-config'

////////////////////////////////////////////////////////////////////////////////
// This script deploys the zion token and delegates it to the deployer.
////////////////////////////////////////////////////////////////////////////////

const deployZionToken: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  console.log("Hello, starting deploy process.");
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("Deploying Zion token...");
  const zionToken = await deploy("Zion", {
    from: deployer,
    args: [],
    log: true,
  });
  log("Deployed Zion token to address: " + zionToken.address);

  console.log(`Deployer is ${deployer}`);
  await delegate(zionToken.address, deployer);
  log("Delegated to deployer");
};

const delegate = async (zionTokenAddress: string, delegatedAccount: string) => {
  const zionToken = await ethers.getContractAt("Zion", zionTokenAddress);
  const tx = await zionToken.delegate(delegatedAccount);
  await tx.wait(1);
  console.log(`Checkpoins ${await zionToken.numCheckpoints(delegatedAccount)}`);
};

export default deployZionToken;
deployZionToken.tags = ["Zion"];
