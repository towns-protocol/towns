// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IAuthorizedClaimersBase} from "contracts/src/tokens/river/mainnet/claimer/IAuthorizedClaimers.sol";

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {AuthorizedClaimers} from "contracts/src/tokens/river/mainnet/claimer/AuthorizedClaimers.sol";
import {DeployAuthorizedClaimers} from "contracts/scripts/deployments/DeployAuthorizedClaimers.s.sol";

contract AuthorizedClaimersTest is TestUtils, IAuthorizedClaimersBase {
  DeployAuthorizedClaimers internal deployAuthorizedClaimers =
    new DeployAuthorizedClaimers();
  AuthorizedClaimers internal authorizedClaimers;

  bytes32 private constant _AUTHORIZE_TYPEHASH =
    0x496b440527e20b246a460857dca887b9c1f290387cfc6ac9aa91bb6554be05ac;

  function setUp() public {
    authorizedClaimers = AuthorizedClaimers(deployAuthorizedClaimers.deploy());
  }

  function test_authorizeClaimer() public {
    address signer = _randomAddress();
    address claimer = _randomAddress();

    vm.prank(signer);
    authorizedClaimers.authorizeClaimer(claimer);
    assertEq(
      authorizedClaimers.getAuthorizedClaimer(signer),
      claimer,
      "authorized claimer not set"
    );
  }

  function test_authorizeClaimerChanged() public {
    authorizedClaimers.authorizeClaimer(address(1));
    assertEq(
      authorizedClaimers.getAuthorizedClaimer(address(this)),
      address(1),
      "authorized claimer not set"
    );
    authorizedClaimers.authorizeClaimer(address(3));
    assertEq(
      authorizedClaimers.getAuthorizedClaimer(address(this)),
      address(3),
      "authorized claimer not set"
    );
  }

  function test_removeAuthorizedClaimer() public {
    authorizedClaimers.authorizeClaimer(address(1));
    authorizedClaimers.removeAuthorizedClaimer();
    assertEq(
      authorizedClaimers.getAuthorizedClaimer(address(this)),
      address(0),
      "authorized claimer not removed"
    );
  }

  function test_getAuthorizedClaimer() public {
    authorizedClaimers.authorizeClaimer(address(1));
    assertEq(
      authorizedClaimers.getAuthorizedClaimer(address(this)),
      address(1),
      "authorized claimer not set"
    );
  }

  function test_getAuthorizedClaimer_notAuthorized() public {
    assertEq(
      authorizedClaimers.getAuthorizedClaimer(_randomAddress()),
      address(0),
      "authorized claimer not set"
    );
  }

  function test_authorizeClaimer_alreadyAuthorized() public {
    authorizedClaimers.authorizeClaimer(address(1));

    vm.expectRevert(AuthorizedClaimers_ClaimerAlreadyAuthorized.selector);

    authorizedClaimers.authorizeClaimer(address(1));

    assertEq(
      authorizedClaimers.getAuthorizedClaimer(address(this)),
      address(1),
      "authorized claimer not set"
    );
  }

  function test_authorizeClaimerBySig() public {
    uint256 privateKey = _randomUint256();
    address owner = vm.addr(privateKey);

    address claimer = _randomAddress();
    uint256 deadline = 0;
    uint256 nonce = authorizedClaimers.nonces(owner);

    (uint8 v, bytes32 r, bytes32 s) = _signAuthorizedClaimer(
      privateKey,
      owner,
      claimer,
      deadline
    );

    authorizedClaimers.authorizeClaimerBySig(
      owner,
      claimer,
      nonce,
      deadline,
      v,
      r,
      s
    );

    assertEq(
      authorizedClaimers.getAuthorizedClaimer(owner),
      claimer,
      "authorized claimer not set"
    );
  }

  // =============================================================
  //                           internal
  // =============================================================
  function _signAuthorizedClaimer(
    uint256 privateKey,
    address signer,
    address claimer,
    uint256 expiry
  ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
    bytes32 domainSeparator = authorizedClaimers.DOMAIN_SEPARATOR();
    uint256 nonce = authorizedClaimers.nonces(signer);

    bytes32 structHash = keccak256(
      abi.encode(_AUTHORIZE_TYPEHASH, signer, claimer, nonce, expiry)
    );

    bytes32 typeDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (v, r, s) = vm.sign(privateKey, typeDataHash);
  }
}
