// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {Treasury} from "src/spaces/facets/treasury/Treasury.sol";

contract DeployTreasury is Deployer, FacetHelper {
    constructor() {
        // Funds
        addSelector(Treasury.withdraw.selector);
        addSelector(Treasury.onERC721Received.selector);
        addSelector(Treasury.onERC1155Received.selector);
        addSelector(Treasury.onERC1155BatchReceived.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/treasuryFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        address treasury = address(new Treasury());
        vm.stopBroadcast();

        return treasury;
    }
}
