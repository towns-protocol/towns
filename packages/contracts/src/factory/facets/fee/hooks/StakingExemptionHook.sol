// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IFeeHook, FeeHookResult} from "../IFeeHook.sol";
import {StakingExemptionHookBase} from "./StakingExemptionHookBase.sol";
import {Ownable} from "solady/auth/Ownable.sol";

/// @title StakingExemptionHook
/// @notice Fee hook that grants exemptions based on staked token amounts
/// @dev Queries IRewardsDistribution.stakedByDepositor() from BaseRegistry
///
/// ## Usage
///
/// 1. Deploy with BaseRegistry address
/// 2. Set exemption thresholds for specific fee types
/// 3. Register hook with FeeManager for desired fee types
///
/// ## Example
///
/// ```solidity
/// // Deploy hook
/// StakingExemptionHook hook = new StakingExemptionHook(baseRegistry);
///
/// // Set threshold: 1000 tokens staked = free tips
/// hook.setExemptionThreshold(FeeTypes.TIP_MEMBER, 1000 ether);
///
/// // Register with FeeManager
/// feeManager.setFeeHook(FeeTypes.TIP_MEMBER, address(hook));
/// ```
contract StakingExemptionHook is IFeeHook, StakingExemptionHookBase, Ownable {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      INITIALIZATION                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initializes the hook with base registry
    /// @param baseRegistry Address of BaseRegistry implementing IRewardsDistribution
    /// @param owner Address to set as owner for configuration
    constructor(address baseRegistry, address owner) {
        _setBaseRegistry(baseRegistry);
        _initializeOwner(owner);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     HOOK INTERFACE                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFeeHook
    function calculateFee(
        bytes32 feeType,
        address user,
        uint256 baseFee,
        bytes calldata context
    ) external view returns (FeeHookResult memory result) {
        return _calculateFee(feeType, user, baseFee, context);
    }

    /// @inheritdoc IFeeHook
    function onChargeFee(
        bytes32 feeType,
        address user,
        uint256 baseFee,
        bytes calldata context
    ) external returns (FeeHookResult memory result) {
        return _onChargeFee(feeType, user, baseFee, context);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   CONFIGURATION (OWNER)                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sets the base registry contract
    /// @dev Only owner can call
    /// @param baseRegistry Address of BaseRegistry implementing IRewardsDistribution
    function setBaseRegistry(address baseRegistry) external onlyOwner {
        _setBaseRegistry(baseRegistry);
    }

    /// @notice Sets the exemption threshold for a fee type
    /// @dev Only owner can call
    /// @param feeType The fee type identifier
    /// @param threshold Minimum stake required for exemption (in wei)
    function setExemptionThreshold(bytes32 feeType, uint256 threshold) external onlyOwner {
        _setExemptionThreshold(feeType, threshold);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Checks if a user is exempt from fees
    /// @param feeType The fee type identifier
    /// @param user The address to check
    /// @return exempt True if user has sufficient stake for exemption
    function isExempt(bytes32 feeType, address user) external view returns (bool exempt) {
        return _isExempt(feeType, user);
    }

    /// @notice Returns the base registry address
    /// @return baseRegistry The base registry address
    function getBaseRegistry() external view returns (address baseRegistry) {
        return _getBaseRegistry();
    }

    /// @notice Returns the exemption threshold for a fee type
    /// @param feeType The fee type identifier
    /// @return threshold The exemption threshold
    function getExemptionThreshold(bytes32 feeType) external view returns (uint256 threshold) {
        return _getExemptionThreshold(feeType);
    }
}
