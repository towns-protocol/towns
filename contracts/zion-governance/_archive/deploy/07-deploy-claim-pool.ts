import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const deployClaimPool: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const zionToken = await ethers.getContract("Zion");

  const claimPool = await deploy("ClaimPool", {
    from: deployer,
    args: [zionToken.address],
    log: true,
  });
  log("Deployed Claim Pool to address: " + claimPool.address);
};

export default deployClaimPool;
