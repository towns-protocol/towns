// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

// libraries
import {console} from "forge-std/console.sol";

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

        deploySpaceCuts(deployer, space);
        deploySpaceOwnerCuts(deployer, spaceOwner);
        deploySpaceFactoryCuts(deployer, spaceFactory);
        deployBaseRegistryCuts(deployer, baseRegistry);
        deployRiverAirdropCuts(deployer, riverAirdrop);
        deployAppRegistryCuts(deployer, appRegistry);

        vm.resumeGasMetering();
    }

    function deploySpaceCuts(address deployer, address space) internal {
        console.log("[INFO]: === Upgrading Space diamond ===");
        deploySpace.diamondInitParams(deployer);
        FacetCut[] memory proposedCuts = deploySpace.getCuts();
        FacetCut[] memory smartCuts = generateSmartCuts(space, proposedCuts);

        console.log("[INFO]: Generated %d smart cuts from %d proposed cuts", smartCuts.length, proposedCuts.length);
        
        if (smartCuts.length > 0) {
            vm.broadcast(deployer);
            IDiamondCut(space).diamondCut(smartCuts, address(0), "");
            console.log("[INFO]: \u2705 Space diamond upgrade completed");
        } else {
            console.log("[INFO]: Space diamond already up to date - no cuts needed");
        }
    }

    function deploySpaceOwnerCuts(address deployer, address spaceOwner) internal {
        console.log("[INFO]: === Upgrading SpaceOwner diamond ===");
        deploySpaceOwner.diamondInitParams(deployer);
        FacetCut[] memory proposedCuts = deploySpaceOwner.getCuts();
        FacetCut[] memory smartCuts = generateSmartCuts(spaceOwner, proposedCuts);

        console.log("[INFO]: Generated %d smart cuts from %d proposed cuts", smartCuts.length, proposedCuts.length);
        
        if (smartCuts.length > 0) {
            vm.broadcast(deployer);
            IDiamondCut(spaceOwner).diamondCut(smartCuts, address(0), "");
            console.log("[INFO]: \u2705 SpaceOwner diamond upgrade completed");
        } else {
            console.log("[INFO]: SpaceOwner diamond already up to date - no cuts needed");
        }
    }

    function deploySpaceFactoryCuts(address deployer, address spaceFactory) internal {
        console.log("[INFO]: === Upgrading SpaceFactory diamond ===");
        deploySpaceFactory.diamondInitParams(deployer);
        FacetCut[] memory proposedCuts = deploySpaceFactory.getCuts();
        FacetCut[] memory smartCuts = generateSmartCuts(spaceFactory, proposedCuts);

        console.log("[INFO]: Generated %d smart cuts from %d proposed cuts", smartCuts.length, proposedCuts.length);
        
        if (smartCuts.length > 0) {
            address spaceFactoryInit = deploySpaceFactory.spaceFactoryInit();
            bytes memory initData = deploySpaceFactory.spaceFactoryInitData();
            vm.broadcast(deployer);
            IDiamondCut(spaceFactory).diamondCut(smartCuts, spaceFactoryInit, initData);
            console.log("[INFO]: \u2705 SpaceFactory diamond upgrade completed");
        } else {
            console.log("[INFO]: SpaceFactory diamond already up to date - no cuts needed");
        }
    }

    function deployBaseRegistryCuts(address deployer, address baseRegistry) internal {
        console.log("[INFO]: === Upgrading BaseRegistry diamond ===");
        deployBaseRegistry.diamondInitParams(deployer);
        FacetCut[] memory proposedCuts = deployBaseRegistry.getCuts();
        FacetCut[] memory smartCuts = generateSmartCuts(baseRegistry, proposedCuts);

        console.log("[INFO]: Generated %d smart cuts from %d proposed cuts", smartCuts.length, proposedCuts.length);
        
        if (smartCuts.length > 0) {
            vm.broadcast(deployer);
            IDiamondCut(baseRegistry).diamondCut(smartCuts, address(0), "");
            console.log("[INFO]: \u2705 BaseRegistry diamond upgrade completed");
        } else {
            console.log("[INFO]: BaseRegistry diamond already up to date - no cuts needed");
        }
    }

    function deployRiverAirdropCuts(address deployer, address riverAirdrop) internal {
        console.log("[INFO]: === Upgrading RiverAirdrop diamond ===");
        deployRiverAirdrop.diamondInitParams(deployer);
        FacetCut[] memory proposedCuts = deployRiverAirdrop.getCuts();
        FacetCut[] memory smartCuts = generateSmartCuts(riverAirdrop, proposedCuts);

        console.log("[INFO]: Generated %d smart cuts from %d proposed cuts", smartCuts.length, proposedCuts.length);
        
        if (smartCuts.length > 0) {
            vm.broadcast(deployer);
            IDiamondCut(riverAirdrop).diamondCut(smartCuts, address(0), "");
            console.log("[INFO]: \u2705 RiverAirdrop diamond upgrade completed");
        } else {
            console.log("[INFO]: RiverAirdrop diamond already up to date - no cuts needed");
        }
    }

    function deployAppRegistryCuts(address deployer, address appRegistry) internal {
        console.log("[INFO]: === Upgrading AppRegistry diamond ===");
        deployAppRegistry.diamondInitParams(deployer);
        FacetCut[] memory proposedCuts = deployAppRegistry.getCuts();
        FacetCut[] memory smartCuts = generateSmartCuts(appRegistry, proposedCuts);

        console.log("[INFO]: Generated %d smart cuts from %d proposed cuts", smartCuts.length, proposedCuts.length);
        
        if (smartCuts.length > 0) {
            vm.broadcast(deployer);
            IDiamondCut(appRegistry).diamondCut(smartCuts, address(0), "");
            console.log("[INFO]: \u2705 AppRegistry diamond upgrade completed");
        } else {
            console.log("[INFO]: AppRegistry diamond already up to date - no cuts needed");
        }
    }
}
