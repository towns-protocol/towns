// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IPlatformFee} from "./IPlatformFee.sol";

// libraries

// contracts
import {PlatformFeeBase} from "./PlatformFeeBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract PlatformFeeFacet is IPlatformFee, PlatformFeeBase, OwnableBase, Facet {
  function __PlatformFee_init(
    address recipient,
    uint16 basisPoints,
    uint256 flatFee
  ) external onlyInitializing {
    _addInterface(type(IPlatformFee).interfaceId);
    _setPlatformFeeRecipient(recipient);
    _setPlatformFee(basisPoints, flatFee);
  }

  function getPlatformFee()
    external
    view
    returns (address recipient, uint16 basisPoints, uint256 flatFee)
  {
    return _getPlatformFee();
  }

  function getPlatformDenominator() external pure returns (uint256) {
    return _getPlatformFeeDenominator();
  }

  function setPlatformFeeRecipient(address recipient) external onlyOwner {
    _setPlatformFeeRecipient(recipient);
  }

  function setPlatformFee(
    uint16 basisPoints,
    uint256 flatFee
  ) external onlyOwner {
    _setPlatformFee(basisPoints, flatFee);
  }
}
