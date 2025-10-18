// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";
import {IArchitect} from "src/factory/facets/architect/IArchitect.sol";
import {ISpaceProxyInitializer} from "src/spaces/facets/proxy/ISpaceProxyInitializer.sol";

// libraries
import {console} from "forge-std/console.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AlphaHelper} from "./helpers/AlphaHelper.sol";

// fetch facet deployer contract
import {DeployMembership} from "scripts/deployments/facets/DeployMembership.s.sol";

contract InteractDiamondCutSpace is Interaction, AlphaHelper {
    function __interact(address deployer) internal override {
        // update with the diamond to cut
        address space = getDeployment("space");
        address spaceFactory = getDeployment("spaceFactory");
        address spaceProxyInitializer = getDeployment("utils/spaceProxyInitializer");

        // update with the facet to remove
        address facetToRemove = 0xA6F23Cd8Ba2e19550d5e2625e7be53ae4Dcc82b4;

        address[] memory facetAddresses = new address[](1);
        facetAddresses[0] = facetToRemove;

        // add the diamond cut to remove the facet
        addCutsToRemove(space, facetAddresses);

        // deploy the new facet
        console.log("deployer", deployer);
        vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");

        // update with a call to the deploy function from your facet deployer contract
        address membershipFacet = DeployMembership.deploy();

        // update with a call to the makeCut function from your facet deployer contract
        addCut(DeployMembership.makeCut(membershipFacet, FacetCutAction.Add));

        // execute the diamond cut
        vm.startBroadcast(deployer);
        IDiamondCut(space).diamondCut(baseFacets(), address(0), "");
        IArchitect(spaceFactory).setProxyInitializer(ISpaceProxyInitializer(spaceProxyInitializer));
        vm.stopBroadcast();
    }
}
