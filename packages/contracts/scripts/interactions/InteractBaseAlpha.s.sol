// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

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
        address space = getDeployment("space");
        address spaceOwner = getDeployment("spaceOwner");
        address spaceFactory = getDeployment("spaceFactory");
        address baseRegistry = getDeployment("baseRegistry");
        address riverAirdrop = getDeployment("riverAirdrop");
        address appRegistry = getDeployment("appRegistry");

        vm.pauseGasMetering();
        removeRemoteFacets(deployer, space);
        removeRemoteFacets(deployer, spaceOwner);
        removeRemoteFacets(deployer, spaceFactory);
        removeRemoteFacets(deployer, baseRegistry);
        removeRemoteFacets(deployer, riverAirdrop);
        removeRemoteFacets(deployer, appRegistry);

        deploySpaceCuts(deployer, space);
        deploySpaceOwnerCuts(deployer, spaceOwner);
        deploySpaceFactoryCuts(deployer, spaceFactory);
        deployBaseRegistryCuts(deployer, baseRegistry);
        deployRiverAirdropCuts(deployer, riverAirdrop);
        deployAppRegistryCuts(deployer, appRegistry);
        vm.resumeGasMetering();
    }

    function deploySpaceCuts(address deployer, address space) internal {
        deploySpace.diamondInitParams(deployer);
        FacetCut[] memory newCuts = deploySpace.getCuts();
        vm.broadcast(deployer);
        IDiamondCut(space).diamondCut(newCuts, address(0), "");
    }

    function deploySpaceOwnerCuts(address deployer, address spaceOwner) internal {
        deploySpaceOwner.diamondInitParams(deployer);
        FacetCut[] memory newCuts = deploySpaceOwner.getCuts();
        vm.broadcast(deployer);
        IDiamondCut(spaceOwner).diamondCut(newCuts, address(0), "");
    }

    function deploySpaceFactoryCuts(address deployer, address spaceFactory) internal {
        deploySpaceFactory.diamondInitParams(deployer);
        FacetCut[] memory newCuts = deploySpaceFactory.getCuts();
        address spaceFactoryInit = deploySpaceFactory.spaceFactoryInit();
        bytes memory initData = deploySpaceFactory.spaceFactoryInitData();
        vm.broadcast(deployer);
        IDiamondCut(spaceFactory).diamondCut(newCuts, spaceFactoryInit, initData);
    }

    function deployBaseRegistryCuts(address deployer, address baseRegistry) internal {
        deployBaseRegistry.diamondInitParams(deployer);
        FacetCut[] memory newCuts = deployBaseRegistry.getCuts();
        vm.broadcast(deployer);
        IDiamondCut(baseRegistry).diamondCut(newCuts, address(0), "");
    }

    function deployRiverAirdropCuts(address deployer, address riverAirdrop) internal {
        deployRiverAirdrop.diamondInitParams(deployer);
        FacetCut[] memory newCuts = deployRiverAirdrop.getCuts();
        vm.broadcast(deployer);
        IDiamondCut(riverAirdrop).diamondCut(newCuts, address(0), "");
    }

    function deployAppRegistryCuts(address deployer, address appRegistry) internal {
        deployAppRegistry.diamondInitParams(deployer);
        FacetCut[] memory newCuts = deployAppRegistry.getCuts();
        vm.broadcast(deployer);
        IDiamondCut(appRegistry).diamondCut(newCuts, address(0), "");
    }
}
