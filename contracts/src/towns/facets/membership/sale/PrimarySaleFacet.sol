// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IPrimarySale} from "./IPrimarySale.sol";

// libraries

// contracts
import {PrimarySaleBase} from "./PrimarySaleBase.sol";
import {Entitled} from "contracts/src/towns/facets/Entitled.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract PrimarySaleFacet is IPrimarySale, PrimarySaleBase, Entitled, Facet {
  function __PrimarySale_init(address recipient) external onlyInitializing {
    _addInterface(type(IPrimarySale).interfaceId);
    _setPrimarySaleRecipient(recipient);
  }

  function primarySaleRecipient() external view returns (address) {
    return _primarySaleRecipient();
  }

  function setPrimarySaleRecipient(address recipient) external onlyOwner {
    _setPrimarySaleRecipient(recipient);
  }
}
