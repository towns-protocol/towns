// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {TieredLogPricing} from "scripts/deployments/utils/pricing/TieredLogPricing.s.sol";
import {TieredLogPricingOracleV2} from "src/spaces/facets/membership/pricing/tiered/TieredLogPricingOracleV2.sol";

contract DeployTieredLogPricingV2 is TieredLogPricing {
    function versionName() public pure override returns (string memory) {
        return "utils/tieredLogPricingV2";
    }

    function __deploy(address deployer) internal override returns (address) {
        address oracle = isAnvil() ? _setupLocalOracle(deployer) : _getOracleAddress();

        vm.broadcast(deployer);
        return address(new TieredLogPricingOracleV2(oracle));
    }
}
