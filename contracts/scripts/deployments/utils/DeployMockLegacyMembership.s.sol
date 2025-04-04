// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {MockLegacyMembership} from "contracts/test/mocks/legacy/membership/MockLegacyMembership.sol";

contract DeployMockLegacyMembership is Deployer, FacetHelper {
    constructor() {
        addSelector(MockLegacyMembership.joinSpaceLegacy.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "utils/mockLegacyMembership";
    }

    function __deploy(address deployer) public override returns (address) {
        vm.startBroadcast(deployer);
        address mockLegacyMembership = address(new MockLegacyMembership());
        vm.stopBroadcast();

        return mockLegacyMembership;
    }
}
