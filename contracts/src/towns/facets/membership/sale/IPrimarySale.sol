// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IPrimarySaleBase {
  error PrimarySaleRecipient__InvalidAddress();

  event PrimarySaleRecipientUpdated(address indexed recipient);
}

interface IPrimarySale is IPrimarySaleBase {
  /**
   * @notice Returns the address of the primary sale recipient
   * @return The address of the primary sale recipient
   */
  function primarySaleRecipient() external view returns (address);

  /**
   * @notice Sets the address of the primary sale recipient
   * @param recipient The address of the primary sale recipient
   */
  function setPrimarySaleRecipient(address recipient) external;
}
