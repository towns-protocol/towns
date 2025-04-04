// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FixedPricing} from "contracts/src/spaces/facets/membership/pricing/fixed/FixedPricing.sol";

contract DeployFixedPricing is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/fixedPricing";
    }

    function __deploy(address deployer) public override returns (address) {
        vm.broadcast(deployer);
        return address(new FixedPricing());
    }
}
