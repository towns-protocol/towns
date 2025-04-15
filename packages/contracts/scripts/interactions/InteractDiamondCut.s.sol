// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

// libraries
import {console} from "forge-std/console.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AlphaHelper} from "./helpers/AlphaHelper.sol";

// facet
import {DeploySpaceOwnerFacet} from "scripts/deployments/facets/DeploySpaceOwnerFacet.s.sol";

contract InteractDiamondCut is Interaction, AlphaHelper {
    function __interact(address deployer) internal override {
        address diamond = getDeployment("spaceOwner");
        address spaceOwnerFacet = 0x09FCbC926F9Ec236fa3f825bF65b62776a9413aD;

        address[] memory facetAddresses = new address[](1);
        facetAddresses[0] = spaceOwnerFacet;

        // add the diamond cut to remove the facet
        addCutsToRemove(diamond, facetAddresses);

        // deploy the new facet
        console.log("deployer", deployer);
        vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");
        vm.broadcast(deployer);
        spaceOwnerFacet = DeploySpaceOwnerFacet.deploy();

        // add the new facet to the diamond
        addCut(DeploySpaceOwnerFacet.makeCut(spaceOwnerFacet, FacetCutAction.Add));

        bytes memory initData = "";

        vm.broadcast(deployer);
        IDiamondCut(diamond).diamondCut(
            baseFacets(),
            initData.length > 0 ? spaceOwnerFacet : address(0),
            initData
        );
    }
}
