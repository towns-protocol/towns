// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

library PublicKey {
  // helper function that computes the address from a public key
  function getAddressFromPublicKey(
    bytes calldata publicKey
  ) public pure returns (address) {
    // The address is computed from the public key by:
    // First, passing the 64 bytes of public key into the keccak256 hash
    // And then, taking the last 20 bytes of the hash
    return address(uint160(uint256(keccak256(publicKey))));
  }

  // helper function that checks if an address is actually derived
  // by a claimed public key
  function addressMatchesPublicKey(
    bytes calldata publicKey,
    address addr
  ) public pure returns (bool) {
    address derivedAddress = getAddressFromPublicKey(publicKey);
    return derivedAddress == addr;
  }
}
