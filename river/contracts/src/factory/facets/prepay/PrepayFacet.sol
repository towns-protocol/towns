// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC165} from "contracts/src/diamond/facets/introspection/IERC165.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IPrepay} from "contracts/src/factory/facets/prepay/IPrepay.sol";

// libraries
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {PrepayBase} from "./PrepayBase.sol";
import {PlatformRequirementsBase} from "contracts/src/factory/facets/platform/requirements/PlatformRequirementsBase.sol";
import {ReentrancyGuard} from "contracts/src/diamond/facets/reentrancy/ReentrancyGuard.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract PrepayFacet is
  IPrepay,
  PrepayBase,
  PlatformRequirementsBase,
  ReentrancyGuard,
  Facet
{
  function __PrepayFacet_init() external onlyInitializing {
    _addInterface(type(IPrepay).interfaceId);
  }

  function prepayMembership(
    address membership,
    uint256 supply
  ) external payable nonReentrant {
    if (supply == 0) revert PrepayBase__InvalidAmount();
    if (membership == address(0)) revert PrepayBase__InvalidAddress();

    // validate caller is owner
    if (IERC173(membership).owner() != msg.sender) {
      revert PrepayBase__InvalidAddress();
    }

    address feeRecipient = _getFeeRecipient();
    uint256 cost = _calculateFee(supply);

    // validate payment covers membership fee
    if (msg.value != cost) revert PrepayBase__InvalidAmount();

    // calculate new total supply
    uint256 newSupply = IERC721A(membership).totalSupply() + supply;

    _prepay(membership, newSupply);

    // transfer fee to DAO
    CurrencyTransfer.safeTransferNativeToken(feeRecipient, cost);
  }

  function prepaidMembershipSupply(
    address account
  ) external view returns (uint256) {
    return _getPrepaidSupply(account);
  }

  function calculateMembershipPrepayFee(
    uint256 supply
  ) external view returns (uint256) {
    return _calculateFee(supply);
  }

  function _calculateFee(uint256 supply) internal view returns (uint256) {
    return supply * _getMembershipFee();
  }
}
