// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IProxyDelegation} from "./IProxyDelegation.sol";
import {ICrossDomainMessenger} from "./ICrossDomainMessenger.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";

// libraries
import {EIP712} from "contracts/src/diamond/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// contracts
import {River} from "contracts/src/tokens/river/mainnet/River.sol";
import {AuthorizedClaimers} from "contracts/src/tokens/river/mainnet/claimer/AuthorizedClaimers.sol";

// Chain: Mainnet
contract ProxyDelegation is IProxyDelegation, EIP712 {
  address public immutable MESSENGER;
  address public immutable TARGET;

  River internal immutable rvr;
  AuthorizedClaimers internal immutable claimers;

  bytes32 private constant _DELEGATION_TYPEHASH =
    keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

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

  function delegateBySig(
    address delegatee,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public {
    rvr.delegateBySig(delegatee, nonce, expiry, v, r, s);

    bytes32 domainSeparator = rvr.DOMAIN_SEPARATOR();
    bytes32 structHash = MessageHashUtils.toTypedDataHash(
      domainSeparator,
      keccak256(abi.encode(_DELEGATION_TYPEHASH, delegatee, nonce, expiry))
    );
    address delegator = ECDSA.recover(structHash, v, r, s);
    uint256 balance = rvr.balanceOf(delegator);

    _sendMessage(
      abi.encodeWithSelector(
        IMainnetDelegation.setDelegation.selector,
        delegator,
        delegatee,
        balance
      )
    );
  }

  function authorizeBySig(
    address owner,
    address claimer,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public {
    claimers.authorizeClaimerBySig(owner, claimer, nonce, expiry, v, r, s);

    _sendMessage(
      abi.encodeWithSelector(
        IMainnetDelegation.setAuthorizedClaimer.selector,
        owner,
        claimer
      )
    );
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _sendMessage(bytes memory data) internal {
    ICrossDomainMessenger(MESSENGER).sendMessage(TARGET, data, 50_000);
  }
}
