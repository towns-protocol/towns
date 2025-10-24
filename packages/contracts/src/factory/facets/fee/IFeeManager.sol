// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {FeeCalculationMethod, FeeConfig} from "./FeeManagerStorage.sol";
import {FeeHookResult} from "./IFeeHook.sol";

/// @title IFeeManagerBase
/// @notice Base interface with errors and events
interface IFeeManagerBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Fee type is not configured or is disabled
    error FeeManager__FeeNotConfigured();

    /// @dev Invalid basis points (must be 1-10000)
    error FeeManager__InvalidBps();

    /// @dev Invalid fee recipient (zero address)
    error FeeManager__InvalidRecipient();

    /// @dev Hook execution failed
    error FeeManager__HookFailed();

    /// @dev Currency transfer failed
    error FeeManager__TransferFailed();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a fee configuration is updated
    /// @param feeType The fee type identifier
    /// @param recipient Fee recipient address
    /// @param method Calculation method
    /// @param bps Basis points
    /// @param fixedFee Fixed fee amount
    /// @param enabled Whether the fee is enabled
    event FeeConfigured(
        bytes32 indexed feeType,
        address recipient,
        FeeCalculationMethod method,
        uint16 bps,
        uint160 fixedFee,
        bool enabled
    );

    /// @notice Emitted when a fee hook is set or removed
    /// @param feeType The fee type identifier
    /// @param hook Address of the hook contract (zero address to remove)
    event FeeHookSet(bytes32 indexed feeType, address hook);

    /// @notice Emitted when the global fee recipient is updated
    /// @param recipient New global fee recipient
    event GlobalFeeRecipientSet(address recipient);

    /// @notice Emitted when a fee is charged
    /// @param feeType The fee type identifier
    /// @param user Address being charged
    /// @param amount Fee amount charged
    /// @param recipient Fee recipient
    /// @param currency Currency contract (address(0) for native token)
    event FeeCharged(
        bytes32 indexed feeType,
        address indexed user,
        uint256 amount,
        address recipient,
        address currency
    );
}

/// @title IFeeManager
/// @notice Complete interface for the FeeManager facet
interface IFeeManager is IFeeManagerBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   INITIALIZATION                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initializes the FeeManager facet
    /// @param globalFeeRecipient Default recipient for all fees
    function initFeeManager(address globalFeeRecipient) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       FEE OPERATIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Calculates fee for estimation purposes (view function)
    /// @dev Does not modify state, safe for UI/contract queries
    /// @param feeType The type of fee to calculate
    /// @param user The address that would be charged
    /// @param amount The base amount for percentage calculations
    /// @param context Additional context passed to hooks
    /// @return finalFee The calculated fee amount
    function calculateFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        bytes calldata context
    ) external view returns (uint256 finalFee);

    /// @notice Charges a fee and transfers it to the recipient
    /// @dev Modifies state, calls hook's onChargeFee, and transfers currency
    /// @param feeType The type of fee to charge
    /// @param user The address being charged
    /// @param amount The base amount for percentage calculations
    /// @param currency The currency contract (address(0) for native token)
    /// @param context Additional context passed to hooks
    /// @return finalFee The actual fee charged
    function chargeFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        address currency,
        bytes calldata context
    ) external payable returns (uint256 finalFee);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   CONFIGURATION (OWNER)                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Configures a fee type
    /// @dev Only owner can call
    /// @param feeType The fee type identifier
    /// @param recipient Fee recipient (uses global if zero address)
    /// @param method Calculation method
    /// @param bps Basis points (1-10000, 10000 = 100%)
    /// @param fixedFee Fixed fee amount in wei
    /// @param enabled Whether the fee is active
    function setFeeConfig(
        bytes32 feeType,
        address recipient,
        FeeCalculationMethod method,
        uint16 bps,
        uint160 fixedFee,
        bool enabled
    ) external;

    /// @notice Sets a fee hook for dynamic fee adjustments
    /// @dev Only owner can call. Set to zero address to remove hook.
    /// @param feeType The fee type identifier
    /// @param hook Address of the hook contract
    function setFeeHook(bytes32 feeType, address hook) external;

    /// @notice Sets the global fee recipient
    /// @dev Only owner can call
    /// @param recipient New global fee recipient
    function setGlobalFeeRecipient(address recipient) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Returns the fee configuration for a fee type
    /// @param feeType The fee type identifier
    /// @return config The fee configuration
    function getFeeConfig(bytes32 feeType) external view returns (FeeConfig memory config);

    /// @notice Returns the fee hook for a fee type
    /// @param feeType The fee type identifier
    /// @return hook The hook contract address (zero if not set)
    function getFeeHook(bytes32 feeType) external view returns (address hook);

    /// @notice Returns the global fee recipient
    /// @return recipient The global fee recipient address
    function getGlobalFeeRecipient() external view returns (address recipient);
}
