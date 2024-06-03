// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ICrossDomainMessenger} from "./ICrossDomainMessenger.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {IProxyBatchDelegation} from "./IProxyBatchDelegation.sol";

// libraries

// contracts
import {River} from "contracts/src/tokens/river/mainnet/River.sol";
import {AuthorizedClaimers} from "contracts/src/tokens/river/mainnet/claimer/AuthorizedClaimers.sol";

contract ProxyBatchDelegation is IProxyBatchDelegation {
  address public immutable MESSENGER;
  address public immutable TARGET;

  River internal immutable rvr;
  AuthorizedClaimers internal immutable claimers;

  constructor(
    address _rvr,
    address _claimers,
    address _messenger,
    address _target
  ) {
    rvr = River(_rvr);
    claimers = AuthorizedClaimers(_claimers);

    MESSENGER = _messenger;
    TARGET = _target;
  }

  function sendDelegators() external {
    address[] memory delegators = rvr.getDelegators();
    address[] memory delegates = new address[](delegators.length);
    address[] memory authorizedClaimers = new address[](delegators.length);
    uint256[] memory quantities = new uint256[](delegators.length);

    for (uint256 i = 0; i < delegators.length; i++) {
      authorizedClaimers[i] = claimers.getAuthorizedClaimer(delegators[i]);
      delegates[i] = rvr.delegates(delegators[i]);
      quantities[i] = rvr.balanceOf(delegators[i]);
    }

    _sendMessage(
      abi.encodeWithSelector(
        IMainnetDelegation.setBatchDelegation.selector,
        delegators,
        delegates,
        authorizedClaimers,
        quantities
      )
    );
  }

  function _sendMessage(bytes memory data) internal {
    ICrossDomainMessenger(MESSENGER).sendMessage(TARGET, data, 400_000);
  }
}
