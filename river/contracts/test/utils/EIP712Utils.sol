// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {EIP712Facet} from "contracts/src/diamond/utils/cryptography/signature/EIP712Facet.sol";

abstract contract EIP712Utils is Test {
  bytes32 private constant PERMIT_TYPEHASH =
    keccak256(
      "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );

  function signPermit(
    uint256 privateKey,
    address eip712,
    address owner,
    address spender,
    uint256 value,
    uint256 deadline
  ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
    uint256 nonces = EIP712Facet(eip712).nonces(owner);

    bytes32 structHash = keccak256(
      abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces, deadline)
    );

    return signIntent(privateKey, eip712, structHash);
  }

  function signIntent(
    uint256 privateKey,
    address eip712,
    bytes32 structHash
  ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
    bytes32 typeDataHash = MessageHashUtils.toTypedDataHash(
      EIP712Facet(eip712).DOMAIN_SEPARATOR(),
      structHash
    );
    (v, r, s) = vm.sign(privateKey, typeDataHash);
  }
}
