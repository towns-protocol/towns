// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAuthorizedClaimers} from "./IAuthorizedClaimers.sol";

// libraries
import {AuthorizedClaimerStorage} from "./AuthorizedClaimerStorage.sol";
import {EIP712} from "contracts/src/diamond/utils/cryptography/EIP712.sol";
import {Nonces} from "contracts/src/diamond/utils/Nonces.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// contracts

// debuggging

contract AuthorizedClaimers is IAuthorizedClaimers, EIP712, Nonces {
  // keccak256("Authorize(address owner,address claimer,uint256 nonce,uint256 expiry)")
  bytes32 private constant _AUTHORIZE_TYPEHASH =
    0x496b440527e20b246a460857dca887b9c1f290387cfc6ac9aa91bb6554be05ac;

  function authorizeClaimerBySig(
    address owner,
    address claimer,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external {
    if (expiry != 0 && block.timestamp >= expiry) {
      revert AuthorizedClaimers_ExpiredSignature();
    }

    address signer = ECDSA.recover(
      _hashTypedDataV4(
        keccak256(
          abi.encode(_AUTHORIZE_TYPEHASH, owner, claimer, nonce, expiry)
        )
      ),
      v,
      r,
      s
    );

    if (signer != owner) {
      revert AuthorizedClaimers_InvalidSignature();
    }

    _useCheckedNonce(owner, nonce);
    _authorizeClaimer(owner, claimer);
  }

  /// @inheritdoc IAuthorizedClaimers
  function authorizeClaimer(address claimer) external {
    _authorizeClaimer(msg.sender, claimer);
  }

  /// @inheritdoc IAuthorizedClaimers
  function removeAuthorizedClaimer() external {
    _authorizeClaimer(msg.sender, address(0));
  }

  /// @inheritdoc IAuthorizedClaimers
  function getAuthorizedClaimer(
    address authorizer
  ) external view returns (address) {
    return AuthorizedClaimerStorage.layout().authorizedClaimers[authorizer];
  }

  function nonces(address owner) external view returns (uint256 result) {
    return _latestNonce(owner);
  }

  function DOMAIN_SEPARATOR() external view returns (bytes32 result) {
    return _domainSeparatorV4();
  }

  // =============================================================
  //                          Internal
  // =============================================================
  function _authorizeClaimer(address signer, address claimer) internal {
    AuthorizedClaimerStorage.Layout storage ds = AuthorizedClaimerStorage
      .layout();

    if (claimer == address(0)) {
      delete ds.authorizedClaimers[signer];
      emit AuthorizedClaimerRemoved(signer);
    } else {
      address currentClaimer = ds.authorizedClaimers[signer];
      if (currentClaimer == claimer)
        revert AuthorizedClaimers_ClaimerAlreadyAuthorized();

      ds.authorizedClaimers[signer] = claimer;

      emit AuthorizedClaimerChanged(signer, claimer);
    }
  }
}
