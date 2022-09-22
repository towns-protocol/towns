import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const deployUserGrantedEntitlementModule: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const zionSpaceManager = await ethers.getContract("ZionSpaceManager");
  const zionSpaceManagerAddress = zionSpaceManager.address;

  //on localhost you need potentially run this again after the first deploy
  //   const zionTokenAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

  const entitlementModule = await deploy("UserGrantedEntitlementModule", {
    from: deployer,
    args: [zionSpaceManagerAddress],
    log: true,
  });
  log("Deployed Entitlement Manager to address: " + entitlementModule.address);
};

deployUserGrantedEntitlementModule.tags = ["user-granted-entitlement-module"];
deployUserGrantedEntitlementModule.dependencies = ["zion-space-manager"];
export default deployUserGrantedEntitlementModule;
