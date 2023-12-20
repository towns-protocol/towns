// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IPlatformFeeBase {
  /**
   * @notice Emitted when the platform fee is updated
   * @param recipient The new recipient of the platform fee
   * @param bps The new basis points of the platform fee
   * @param flat The new flat fee of the platform fee
   */
  event PlatformFeeUpdated(address indexed recipient, uint16 bps, uint256 flat);

  /// @notice Revert when the platform fee is invalid
  error InvalidPlatformFee();

  /// @notice Revert when the platform fee recipient is invalid
  error InvalidPlatformFeeRecipient();
}

interface IPlatformFee is IPlatformFeeBase {
  /**
   * @notice Get the platform fee
   * @return recipient The recipient of the fee
   * @return bps The basis points of the fee
   * @return flat The flat fee
   */
  function getPlatformFee()
    external
    view
    returns (address recipient, uint16 bps, uint256 flat);

  /**
   * @notice Get the platform fee denominator
   * @return The denominator of the platform fee
   */
  function getPlatformDenominator() external view returns (uint256);

  /**
   * @notice Set the platform fee
   * @param recipient The recipient of the fee
   */
  function setPlatformFeeRecipient(address recipient) external;

  /**
   * @notice Set the platform fee
   * @param bps The basis points of the fee
   * @param flat The flat fee
   */
  function setPlatformFee(uint16 bps, uint256 flat) external;
}
