// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {DeployBaseRegistry} from "scripts/deployments/diamonds/DeployBaseRegistry.s.sol";
import {DeployRiverAirdrop} from "scripts/deployments/diamonds/DeployRiverAirdrop.s.sol";
import {DeploySpace} from "scripts/deployments/diamonds/DeploySpace.s.sol";
import {DeploySpaceFactory} from "scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeploySpaceOwner} from "scripts/deployments/diamonds/DeploySpaceOwner.s.sol";
import {DeployAppRegistry} from "scripts/deployments/diamonds/DeployAppRegistry.s.sol";
import {AlphaHelper} from "scripts/interactions/helpers/AlphaHelper.sol";

contract InteractBaseAlpha is AlphaHelper {
    DeploySpace deploySpace = new DeploySpace();
    DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
    DeployBaseRegistry deployBaseRegistry = new DeployBaseRegistry();
    DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
    DeployRiverAirdrop deployRiverAirdrop = new DeployRiverAirdrop();
    DeployAppRegistry deployAppRegistry = new DeployAppRegistry();

    function __interact(address deployer) internal override {
        vm.pauseGasMetering();

        address space = getDeployment("space");
        address spaceOwner = getDeployment("spaceOwner");
        address spaceFactory = getDeployment("spaceFactory");
        address baseRegistry = getDeployment("baseRegistry");
        address riverAirdrop = getDeployment("riverAirdrop");
        address appRegistry = getDeployment("appRegistry");

        executeDiamondCutsWithLogging(deployer, space, "Space", deploySpace);
        executeDiamondCutsWithLogging(deployer, spaceOwner, "SpaceOwner", deploySpaceOwner);

        address spaceFactoryInit = deploySpaceFactory.spaceFactoryInit();
        bytes memory initData = deploySpaceFactory.spaceFactoryInitData();
        executeDiamondCutsWithLogging(
            deployer,
            spaceFactory,
            "SpaceFactory",
            deploySpaceFactory,
            spaceFactoryInit,
            initData
        );

        executeDiamondCutsWithLogging(deployer, baseRegistry, "BaseRegistry", deployBaseRegistry);
        executeDiamondCutsWithLogging(deployer, riverAirdrop, "RiverAirdrop", deployRiverAirdrop);
        executeDiamondCutsWithLogging(deployer, appRegistry, "AppRegistry", deployAppRegistry);

        vm.resumeGasMetering();
    }
}
