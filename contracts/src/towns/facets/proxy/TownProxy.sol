// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {ITownProxy} from "./ITownProxy.sol";
import {IERC5643} from "contracts/src/diamond/facets/token/ERC5643/IERC5643.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";

// libraries

// contracts
import {ManagedProxyBase} from "contracts/src/diamond/proxy/managed/ManagedProxyBase.sol";
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";
import {MembershipBase} from "contracts/src/towns/facets/membership/MembershipBase.sol";
import {MembershipReferralBase} from "contracts/src/towns/facets/membership/referral/MembershipReferralBase.sol";
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {IntrospectionBase} from "contracts/src/diamond/facets/introspection/IntrospectionBase.sol";

import {Multicall} from "contracts/src/diamond/utils/multicall/Multicall.sol";

contract TownProxy is
  ITownProxy,
  IntrospectionBase,
  ManagedProxyBase,
  TokenOwnableBase,
  ERC721ABase,
  MembershipBase,
  MembershipReferralBase,
  Multicall
{
  constructor(TownProxyInit memory init) {
    __IntrospectionBase_init();
    __ManagedProxyBase_init(init.managedProxy);
    __TokenOwnableBase_init(
      init.tokenOwnable.townOwner,
      init.tokenOwnable.tokenId
    );
    __ERC721ABase_init(init.membership.name, init.membership.symbol);
    __MembershipBase_init(init.membership, init.managedProxy.manager);
    __MembershipReferralBase_init();
  }

  function _startTokenId() internal pure override returns (uint256) {
    return 1;
  }

  function _setInterfaceIds() internal {
    _addInterface(0x80ac58cd); // ERC165 Interface ID for ERC721
    _addInterface(0x5b5e139f); // ERC165 Interface ID for ERC721Metadata
    _addInterface(type(IERC5643).interfaceId); // ERC165 Interface ID for IERC5643
    _addInterface(type(IERC173).interfaceId); // ERC165 Interface ID for IERC173
  }

  receive() external payable {}
}
