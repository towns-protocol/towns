// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {ISignatureMintERC721} from "contracts/src/utils/interfaces/ISignatureMintERC721.sol";

// contracts
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

abstract contract SignatureMintERC721 is EIP712, ISignatureMintERC721 {
  using ECDSA for bytes32;

  /* solhint-disable */
  bytes32 private constant TYPEHASH =
    keccak256(
      "MintRequest(address to,address royaltyReceiver,uint256 royaltyValue,address primarySaleReceiver,string uri,uint256 quantity,uint256 pricePerToken,address currency,uint128 validityStartTimestamp,uint128 validityEndTimestamp,bytes32 uid)"
    );
  /* solhint-enable */

  /// @dev mapping from mint request uid => whether the mint request is processed
  mapping(bytes32 => bool) private minted;

  constructor() EIP712("SignatureMintERC721", "1") {}

  /// @inheritdoc ISignatureMintERC721
  function verify(
    MintRequest calldata mintRequest,
    bytes calldata signature
  ) public view override returns (bool success, address signer) {
    signer = _recoverAddress(mintRequest, signature);
    success = !minted[mintRequest.uid] && _canSignMintRequest(signer);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /// @dev Returns whether a given address is authorized to sign mint requests
  function _canSignMintRequest(
    address signer
  ) internal view virtual returns (bool);

  /// @dev Verifies a mint request and marks the request as minted
  function _processRequest(
    MintRequest calldata mintRequest,
    bytes calldata signature
  ) internal returns (address signer) {
    bool success;
    (success, signer) = verify(mintRequest, signature);

    if (!success) {
      revert("SignatureMintERC721: invalid signature");
    }

    if (
      mintRequest.validityStartTimestamp > block.timestamp ||
      block.timestamp > mintRequest.validityEndTimestamp
    ) {
      revert("SignatureMintERC721: mint request is expired");
    }

    require(
      mintRequest.to != address(0),
      "SignatureMintERC721: invalid to address"
    );
    require(mintRequest.quantity > 0, "SignatureMintERC721: invalid quantity");

    minted[mintRequest.uid] = true;
  }

  /// @dev Returns the address of the signer of a mint request
  function _recoverAddress(
    MintRequest calldata mintRequest,
    bytes calldata signature
  ) internal view returns (address) {
    return
      _hashTypedDataV4(keccak256(_encodeRequest(mintRequest))).recover(
        signature
      );
  }

  /// @dev Resolves `stack too deep` error in `_recoverAddress`
  function _encodeRequest(
    MintRequest calldata mintRequest
  ) internal pure returns (bytes memory) {
    return
      abi.encode(
        TYPEHASH,
        mintRequest.to,
        mintRequest.royaltyReceiver,
        mintRequest.royaltyValue,
        mintRequest.primarySaleReceiver,
        keccak256(bytes(mintRequest.uri)),
        mintRequest.quantity,
        mintRequest.pricePerToken,
        mintRequest.currency,
        mintRequest.validityStartTimestamp,
        mintRequest.validityEndTimestamp,
        mintRequest.uid
      );
  }
}
