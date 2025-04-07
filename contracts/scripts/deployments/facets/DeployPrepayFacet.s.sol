// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {PrepayFacet} from "contracts/src/spaces/facets/prepay/PrepayFacet.sol";

contract DeployPrepayFacet is FacetHelper, Deployer {
    constructor() {
        addSelector(PrepayFacet.prepayMembership.selector);
        addSelector(PrepayFacet.prepaidMembershipSupply.selector);
        addSelector(PrepayFacet.calculateMembershipPrepayFee.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return PrepayFacet.__PrepayFacet_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "facets/prepayFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        PrepayFacet facet = new PrepayFacet();
        vm.stopBroadcast();
        return address(facet);
    }
}
