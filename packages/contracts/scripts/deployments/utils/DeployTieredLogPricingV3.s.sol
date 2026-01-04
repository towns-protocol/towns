// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {TieredLogPricing} from "scripts/deployments/utils/pricing/TieredLogPricing.s.sol";
import {TieredLogPricingOracleV3} from "src/spaces/facets/membership/pricing/tiered/TieredLogPricingOracleV3.sol";

contract DeployTieredLogPricingV3 is TieredLogPricing {
    function versionName() public pure override returns (string memory) {
        return "utils/tieredLogPricingV3";
    }

    function __deploy(address deployer) internal override returns (address) {
        address oracle = isAnvil() ? _setupLocalOracle(deployer) : _getOracleAddress();

        vm.broadcast(deployer);
        return address(new TieredLogPricingOracleV3(oracle));
    }
}
