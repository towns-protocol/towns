// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

// libraries
import {console} from "forge-std/console.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AlphaHelper} from "./helpers/AlphaHelper.sol";

// fetch facet deployer contract
import {DeploySubscriptionModuleFacet} from "scripts/deployments/facets/DeploySubscriptionModuleFacet.s.sol";
import {SubscriptionModuleFacet} from "src/apps/modules/subscription/SubscriptionModuleFacet.sol";

contract InteractDiamondCut is Interaction, AlphaHelper {
    function __interact(address deployer) internal override {
        // update with the diamond to cut
        address diamond = getDeployment("subscriptionModule");

        // update with the facet to remove
        address facetToRemove = 0xf86be0b52aABa39C3fAAa2a78e340a658B90d9DB;

        address[] memory facetAddresses = new address[](1);
        facetAddresses[0] = facetToRemove;

        // add the diamond cut to remove the facet
        addCutsToRemove(diamond, facetAddresses);

        // deploy the new facet
        console.log("deployer", deployer);
        vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");

        // update with a call to the deploy function from your facet deployer contract
        address facetAddress = DeploySubscriptionModuleFacet.deploy();

        // update with a call to the makeCut function from your facet deployer contract
        addCut(DeploySubscriptionModuleFacet.makeCut(facetAddress, FacetCutAction.Add));

        // execute the diamond cut
        vm.broadcast(deployer);
        IDiamondCut(diamond).diamondCut(baseFacets(), address(0), "");

        vm.broadcast(deployer);
        SubscriptionModuleFacet(diamond).setSpaceFactory(getDeployment("spaceFactory"));
    }
}
