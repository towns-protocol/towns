// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {FeeCalculationMethod, FeeConfig} from "./FeeManagerStorage.sol";

/// @title IFeeManagerBase
/// @notice Base interface with errors and events
interface IFeeManagerBase {
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
        uint128 fixedFee,
        bool enabled
    );

    /// @notice Emitted when a fee hook is set or removed
    /// @param feeType The fee type identifier
    /// @param hook Address of the hook contract (zero address to remove)
    event FeeHookSet(bytes32 indexed feeType, address hook);

    /// @notice Emitted when the protocol fee recipient is updated
    /// @param recipient New protocol fee recipient
    event ProtocolFeeRecipientSet(address recipient);

    /// @notice Emitted when a fee is charged
    /// @param feeType The fee type identifier
    /// @param user Address being charged
    /// @param currency Currency contract (address(0) for native token)
    /// @param amount Fee amount charged
    /// @param recipient Fee recipient
    event FeeCharged(
        bytes32 indexed feeType,
        address indexed user,
        address indexed currency,
        uint256 amount,
        address recipient
    );

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

    /// @dev Invalid hook (zero address)
    error FeeManager__InvalidHook();

    /// @dev Invalid method
    error FeeManager__InvalidMethod();

    /// @dev Max fee exceeded
    error FeeManager__ExceedsMaxFee();
}

/// @title IFeeManager
/// @notice Complete interface for the FeeManager facet
interface IFeeManager is IFeeManagerBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       FEE OPERATIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Charges a fee and transfers it to the recipient
    /// @dev Modifies state, calls hook's onChargeFee, and transfers currency
    /// @param feeType The type of fee to charge
    /// @param user The address being charged
    /// @param amount The base amount for percentage calculations
    /// @param currency The currency contract (address(0) for native token)
    /// @param maxFee The maximum fee that can be charged (amount + slippage tolerance)
    /// @param extraData Additional data passed to hooks
    /// @return finalFee The actual fee charged
    function chargeFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        address currency,
        uint256 maxFee,
        bytes calldata extraData
    ) external payable returns (uint256 finalFee);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   INITIALIZATION                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initializes the FeeManager facet
    /// @param protocolFeeRecipient Protocol fee recipient for all fees
    function __FeeManagerFacet__init(address protocolFeeRecipient) external;

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
        uint128 fixedFee,
        bool enabled
    ) external;

    /// @notice Sets a fee hook for dynamic fee adjustments
    /// @dev Only owner can call. Set to zero address to remove hook.
    /// @param feeType The fee type identifier
    /// @param hook Address of the hook contract
    function setFeeHook(bytes32 feeType, address hook) external;

    /// @notice Sets the protocol fee recipient
    /// @dev Only owner can call
    /// @param recipient New protocol fee recipient
    function setProtocolFeeRecipient(address recipient) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Calculates fee for estimation purposes (view function)
    /// @dev Does not modify state, safe for UI/contract queries
    /// @param feeType The type of fee to calculate
    /// @param user The address that would be charged
    /// @param amount The base amount for percentage calculations
    /// @param extraData Additional data passed to hooks
    /// @return finalFee The calculated fee amount
    function calculateFee(
        bytes32 feeType,
        address user,
        uint256 amount,
        bytes calldata extraData
    ) external view returns (uint256 finalFee);

    /// @notice Returns the fee configuration for a fee type
    /// @param feeType The fee type identifier
    /// @return config The fee configuration
    function getFeeConfig(bytes32 feeType) external view returns (FeeConfig memory config);

    /// @notice Returns the fee hook for a fee type
    /// @param feeType The fee type identifier
    /// @return hook The hook contract address (zero if not set)
    function getFeeHook(bytes32 feeType) external view returns (address hook);

    /// @notice Returns the protocol fee recipient
    /// @return recipient The protocol fee recipient address
    function getProtocolFeeRecipient() external view returns (address recipient);
}
