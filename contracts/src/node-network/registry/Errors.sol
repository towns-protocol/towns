//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

library Errors {
  /**
   * @notice  Reverted because the validator's address doesn't match its public key.
   */
  error ValidatorAddressNotDerivedFromPublicKey();

  /**
   * @notice  Reverted because an operator-only function is called by a non-operator.
   */
  error OnlyOperator();

  /**
   * @notice  Reverted because the node is already on the access registry.
   */
  error AlreadyRegistered();

  /**
   * @notice  Reverted because the node is not on the access registry.
   */
  error NotRegistered();

  /**
   * @notice  Reverted because the validator's signature is invalid.
   * @dev     This revert happens inside the NodeRegistryFacet, not the NodeRegistryBase.
   */
  error InvalidValidatorSignature();
}
