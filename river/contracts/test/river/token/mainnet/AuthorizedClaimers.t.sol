// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IAuthorizedClaimers} from "contracts/src/tokens/river/mainnet/IAuthorizedClaimers.sol";

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {AuthorizedClaimers} from "contracts/src/tokens/river/mainnet/AuthorizedClaimers.sol";
import {DeployAuthorizedClaimers} from "contracts/scripts/deployments/DeployAuthorizedClaimers.s.sol";

contract AuthorizedClaimersTest is TestUtils {
  DeployAuthorizedClaimers internal deployAuthorizedClaimers =
    new DeployAuthorizedClaimers();

  AuthorizedClaimers internal authorizedClaimers;

  function setUp() public {
    authorizedClaimers = AuthorizedClaimers(deployAuthorizedClaimers.deploy());
  }

  function test_authorizeClaimer() public {
    authorizedClaimers.authorizeClaimer(address(1));
    assertEq(
      authorizedClaimers.getAuthorizedClaimer(address(this)),
      address(1),
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
      authorizedClaimers.getAuthorizedClaimer(address(this)),
      address(0),
      "authorized claimer not set"
    );
  }

  function test_authorizeClaimer_alreadyAuthorized() public {
    authorizedClaimers.authorizeClaimer(address(1));

    vm.expectRevert(
      IAuthorizedClaimers.AuthorizedClaimers_ClaimerAlreadyAuthorized.selector
    );

    authorizedClaimers.authorizeClaimer(address(1));

    assertEq(
      authorizedClaimers.getAuthorizedClaimer(address(this)),
      address(1),
      "authorized claimer not set"
    );
  }
}
