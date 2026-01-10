// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @notice Result returned by fee hooks
/// @param finalFee The final fee amount after hook processing
/// @param metadata Optional metadata for off-chain consumption
struct FeeHookResult {
    uint256 finalFee;
    bytes metadata;
}

/// @title IFeeHook
/// @notice Interface for fee hooks that provide dynamic fee adjustments
/// @dev Hooks can modify fees, grant exemptions, enforce quotas, or apply complex logic
///
/// ## Hook Execution Flow
///
/// 1. **Read-Only Path (`calculateFee`)**: Used for fee estimation and UI display
///    - Pure view function with no state changes
///    - Safe to call from any context
///    - Used by `FeeManager.calculateFee()`
///
/// 2. **Write Path (`onChargeFee`)**: Used during actual fee charging
///    - May mutate state (e.g., quota tracking, usage limits)
///    - Called by `FeeManager.chargeFee()`
///    - Should include all logic from `calculateFee` plus state updates
///
/// ## Implementation Patterns
///
/// ### Simple Exemption (Staking-Based)
/// ```solidity
/// function calculateFee(...) external view returns (FeeHookResult memory) {
///     bool exempt = stakingRegistry.stakedAmount(user) >= threshold;
///     return FeeHookResult({
///         finalFee: exempt ? 0 : baseFee,
///         metadata: ""
///     });
/// }
///
/// function onChargeFee(...) external returns (FeeHookResult memory) {
///     return calculateFee(...); // No state to update
/// }
/// ```
///
/// ### Quota-Based (Future)
/// ```solidity
/// function onChargeFee(...) external returns (FeeHookResult memory) {
///     uint256 used = quotaUsed[user]++;
///     bool exempt = used < quota[user];
///     return FeeHookResult({
///         finalFee: exempt ? 0 : baseFee,
///         metadata: abi.encode(used, quota[user])
///     });
/// }
/// ```
interface IFeeHook {
    /// @notice Processes fee during actual charging (may mutate state)
    /// @dev This function MAY modify state (e.g., quota tracking, usage counts)
    /// @dev Called during actual fee charging via `FeeManager.chargeFee()`
    /// @param feeType The type of fee being charged
    /// @param user The address being charged the fee
    /// @param baseFee The base fee amount before hook processing
    /// @param context Additional context (e.g., amount being tipped, item being purchased)
    /// @return result Fee calculation result with final fee
    function onChargeFee(
        bytes32 feeType,
        address user,
        uint256 baseFee,
        bytes calldata context
    ) external returns (FeeHookResult memory result);

    /// @notice Calculates fee for estimation purposes (view function)
    /// @dev This function MUST be view/pure and not modify state
    /// @dev Used by UIs and contracts for fee previews
    /// @param feeType The type of fee being calculated
    /// @param user The address being charged the fee
    /// @param baseFee The base fee amount before hook processing
    /// @param context Additional context (e.g., amount being tipped, item being purchased)
    /// @return result Fee calculation result with final fee
    function calculateFee(
        bytes32 feeType,
        address user,
        uint256 baseFee,
        bytes calldata context
    ) external view returns (FeeHookResult memory result);
}
