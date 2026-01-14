// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts
import {Deployer} from "../../common/Deployer.s.sol";
import {DomainFeeHook} from "src/domains/hooks/DomainFeeHook.sol";

contract DeployDomainFeeHook is Deployer {
    /// @dev Default price for domain registration (5 USDC with 6 decimals)
    uint256 internal constant DEFAULT_PRICE = 5e6;

    address internal owner;
    address internal feeManager;
    uint256 internal defaultPrice;

    function versionName() public pure override returns (string memory) {
        return "utils/domainFeeHook";
    }

    /// @notice Set the owner address
    /// @param owner_ The owner address for the DomainFeeHook
    function setOwner(address owner_) external {
        owner = owner_;
    }

    /// @notice Set the fee manager address
    /// @param feeManager_ The fee manager address authorized to call onChargeFee
    function setFeeManager(address feeManager_) external {
        feeManager = feeManager_;
    }

    /// @notice Set the default price for registrations
    /// @param defaultPrice_ The default price in USDC (6 decimals)
    function setDefaultPrice(uint256 defaultPrice_) external {
        defaultPrice = defaultPrice_;
    }

    /// @notice Set all deployment parameters at once
    /// @param owner_ The owner address
    /// @param feeManager_ The fee manager address
    /// @param defaultPrice_ The default price for registrations
    function setParams(address owner_, address feeManager_, uint256 defaultPrice_) external {
        owner = owner_;
        feeManager = feeManager_;
        defaultPrice = defaultPrice_;
    }

    function __deploy(address deployer) internal override returns (address) {
        address ownerAddr = _getOwner(deployer);
        address feeManagerAddr = _getFeeManager();
        uint256 price = _getDefaultPrice();

        require(ownerAddr != address(0), "DeployDomainFeeHook: owner not set");
        require(feeManagerAddr != address(0), "DeployDomainFeeHook: feeManager not set");

        vm.broadcast(deployer);
        return address(new DomainFeeHook(ownerAddr, feeManagerAddr, price));
    }

    function _getOwner(address deployer) internal view returns (address) {
        return owner == address(0) ? deployer : owner;
    }

    function _getFeeManager() internal returns (address) {
        if (feeManager != address(0)) return feeManager;

        // Try to get from existing deployments (spaceFactory acts as fee manager)
        return getDeployment("spaceFactory");
    }

    function _getDefaultPrice() internal view returns (uint256) {
        return defaultPrice == 0 ? DEFAULT_PRICE : defaultPrice;
    }
}
