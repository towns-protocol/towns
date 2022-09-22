import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const deployBackgroundPicker: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  log("Deploying greeter");

  const greeterDeployed = await deploy("Greeter", {
    from: deployer,
    args: ["The deployed greeting is: hi."],
    log: true,
  });

  log("Greeter deployed to: ", greeterDeployed.address);
};

export default deployBackgroundPicker;
