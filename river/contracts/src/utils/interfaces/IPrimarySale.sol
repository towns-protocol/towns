// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPrimarySale {
  /// @dev The address that receives the primary sales value.
  function primarySaleRecipient() external view returns (address);

  /// @dev Lets a module admin set the default recipient of all primary sales.
  function setPrimarySaleRecipient(address _recipient) external;

  /// @dev Emitted when a new sale recipient is set.
  event PrimarySaleRecipientUpdated(address indexed _recipient);
}
