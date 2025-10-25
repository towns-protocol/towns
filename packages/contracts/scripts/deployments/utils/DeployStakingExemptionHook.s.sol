// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// contracts
import {StakingExemptionHook} from "src/factory/facets/fee/hooks/StakingExemptionHook.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

/// @title DeployStakingExemptionHook
/// @notice Deployment script for StakingExemptionHook
contract DeployStakingExemptionHook is Deployer {
    address public baseRegistry;
    address public owner;

    function versionName() public pure override returns (string memory) {
        return "utils/stakingExemptionHook";
    }

    /// @notice Sets deployment dependencies
    /// @param baseRegistry_ Address of BaseRegistry with IRewardsDistribution
    /// @param owner_ Address to set as hook owner
    function setDependencies(address baseRegistry_, address owner_) external {
        baseRegistry = baseRegistry_;
        owner = owner_;
    }

    function __deploy(address deployer) internal override returns (address) {
        require(baseRegistry != address(0), "Base registry not set");
        require(owner != address(0), "Owner not set");

        vm.broadcast(deployer);
        StakingExemptionHook hook = new StakingExemptionHook(baseRegistry, owner);

        return address(hook);
    }
}
