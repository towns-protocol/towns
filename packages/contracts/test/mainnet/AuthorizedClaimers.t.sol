// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAuthorizedClaimersBase} from "src/tokens/mainnet/claimer/IAuthorizedClaimers.sol";

// contracts
import {AuthorizedClaimers} from "src/tokens/mainnet/claimer/AuthorizedClaimers.sol";
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

contract AuthorizedClaimersTest is TestUtils, IAuthorizedClaimersBase {
    AuthorizedClaimers internal authorizedClaimers;

    bytes32 private constant _AUTHORIZE_TYPEHASH =
        0x496b440527e20b246a460857dca887b9c1f290387cfc6ac9aa91bb6554be05ac;

    function setUp() public {
        authorizedClaimers = AuthorizedClaimers(deployCode("AuthorizedClaimers.sol", ""));
    }

    function test_fuzz_authorizeClaimer(address signer, address claimer) public {
        vm.prank(signer);
        authorizedClaimers.authorizeClaimer(claimer);
        assertEq(
            authorizedClaimers.getAuthorizedClaimer(signer),
            claimer,
            "authorized claimer not set"
        );
    }

    function test_authorizeClaimerChanged() public {
        test_fuzz_authorizeClaimerChanged(address(1), address(3));
    }

    function test_fuzz_authorizeClaimerChanged(address claimer, address newClaimer) public {
        vm.assume(claimer != newClaimer);
        authorizedClaimers.authorizeClaimer(claimer);
        assertEq(
            authorizedClaimers.getAuthorizedClaimer(address(this)),
            claimer,
            "authorized claimer not set"
        );
        authorizedClaimers.authorizeClaimer(newClaimer);
        assertEq(
            authorizedClaimers.getAuthorizedClaimer(address(this)),
            newClaimer,
            "authorized claimer not set"
        );
    }

    function test_removeAuthorizedClaimer() public {
        test_fuzz_removeAuthorizedClaimer(address(1));
    }

    function test_fuzz_removeAuthorizedClaimer(address claimer) public {
        authorizedClaimers.authorizeClaimer(claimer);
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

    function test_fuzz_getAuthorizedClaimer_notAuthorized(address signer) public view {
        assertEq(
            authorizedClaimers.getAuthorizedClaimer(signer),
            address(0),
            "authorized claimer not set"
        );
    }

    function test_fuzz_authorizeClaimer_alreadyAuthorized(address claimer) public {
        vm.assume(claimer != address(0));
        authorizedClaimers.authorizeClaimer(claimer);

        vm.expectRevert(AuthorizedClaimers_ClaimerAlreadyAuthorized.selector);

        authorizedClaimers.authorizeClaimer(claimer);

        assertEq(
            authorizedClaimers.getAuthorizedClaimer(address(this)),
            claimer,
            "authorized claimer not set"
        );
    }

    function test_fuzz_authorizeClaimerBySig(uint256 privateKey, address claimer) public {
        privateKey = bound(
            privateKey,
            1,
            0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140
        );
        address owner = vm.addr(privateKey);

        uint256 deadline = 0;
        uint256 nonce = authorizedClaimers.nonces(owner);

        (uint8 v, bytes32 r, bytes32 s) = _signAuthorizedClaimer(
            privateKey,
            owner,
            claimer,
            deadline
        );

        authorizedClaimers.authorizeClaimerBySig(owner, claimer, nonce, deadline, v, r, s);

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

        bytes32 typeDataHash = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (v, r, s) = vm.sign(privateKey, typeDataHash);
    }
}
