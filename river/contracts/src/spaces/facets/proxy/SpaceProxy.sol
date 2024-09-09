// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC5643} from "contracts/src/diamond/facets/token/ERC5643/IERC5643.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";

// libraries

// contracts
import {ManagedProxyBase} from "contracts/src/diamond/proxy/managed/ManagedProxyBase.sol";
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";
import {MembershipBase} from "contracts/src/spaces/facets/membership/MembershipBase.sol";
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {IntrospectionBase} from "contracts/src/diamond/facets/introspection/IntrospectionBase.sol";
import {EntitlementGatedBase} from "contracts/src/spaces/facets/gated/EntitlementGatedBase.sol";
import {Multicallable} from "solady/utils/Multicallable.sol";

contract SpaceProxy is
  IntrospectionBase,
  ManagedProxyBase,
  TokenOwnableBase,
  ERC721ABase,
  MembershipBase,
  EntitlementGatedBase,
  Multicallable
{
  constructor(
    address owner,
    ManagedProxy memory managedProxy,
    TokenOwnable memory tokenOwnable,
    Membership memory membership
  ) {
    __IntrospectionBase_init();
    __ManagedProxyBase_init(managedProxy);
    __TokenOwnableBase_init(tokenOwnable);
    __ERC721ABase_init(membership.name, membership.symbol);
    __MembershipBase_init(membership, managedProxy.manager);

    _safeMint(owner, 1);
    _setFallbackEntitlementChecker();

    _setInterfaceIds();
  }

  function _setInterfaceIds() internal {
    _addInterface(0x80ac58cd); // ERC165 Interface ID for ERC721
    _addInterface(0x5b5e139f); // ERC165 Interface ID for ERC721Metadata
    _addInterface(type(IERC5643).interfaceId); // ERC165 Interface ID for IERC5643
    _addInterface(type(IERC173).interfaceId); // ERC165 Interface ID for IERC173 (owner)
    _addInterface(type(IMembership).interfaceId); // ERC165 Interface ID for IMembership
  }

  receive() external payable {}
}
