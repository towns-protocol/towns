// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces

// libraries
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {ERC721Base} from "contracts/src/tokens/base/ERC721Base.sol";
import {PrimarySale} from "contracts/src/utils/PrimarySale.sol";
import {SignatureMintERC721} from "contracts/src/utils/SignatureMintERC721.sol";

import {console} from "forge-std/console.sol";

/**
 * @title ERC721SignatureMint
 * @author Towns
 * @notice This contract is used to mint ERC721 tokens via a signature.
 */
contract ERC721SignatureMint is ERC721Base, PrimarySale, SignatureMintERC721 {
  constructor(
    string memory name_,
    string memory symbol_,
    address royaltyReceiver_,
    uint256 royaltyAmount_,
    address primarySaleRecipient_
  ) ERC721Base(name_, symbol_, royaltyReceiver_, royaltyAmount_) {
    _setPrimarySaleRecipient(primarySaleRecipient_);
  }

  /// @notice Mints a token with a signature
  /// @param mintRequest The request to mint a token
  /// @param signature The signature of the mint request
  function mintWithSignature(
    MintRequest calldata mintRequest,
    bytes calldata signature
  ) external payable virtual override returns (address signer) {
    require(
      mintRequest.quantity == 1,
      "ERC721SignatureMint: quantity must be 1"
    );

    uint256 tokenId = nextTokenId();

    // Verify and process payload
    signer = _processRequest(mintRequest, signature);

    // Get receiver
    address receiver = mintRequest.to;

    // Collect price
    _collectPriceOnClaim(
      mintRequest.primarySaleReceiver,
      mintRequest.quantity,
      mintRequest.currency,
      mintRequest.pricePerToken
    );

    // Set royalties, if any
    if (
      mintRequest.royaltyReceiver != address(0) && mintRequest.royaltyValue != 0
    ) {
      _setRoyaltyInfoForToken(
        tokenId,
        mintRequest.royaltyReceiver,
        mintRequest.royaltyValue
      );
    }

    // Mint token
    _setTokenURI(tokenId, mintRequest.uri);
    _safeMint(receiver, mintRequest.quantity);

    emit TokensMintedWithSignature(signer, receiver, tokenId, mintRequest);
  }

  /// @dev Returns whether a given address is authorized to sign mint requests
  function _canSignMintRequest(
    address _signer
  ) internal view virtual override returns (bool) {
    return _signer == owner();
  }

  /// @dev Returns whether primary sale recipient can be set in the given execution context
  function _canSetPrimarySaleRecipient()
    internal
    view
    virtual
    override
    returns (bool)
  {
    return _msgSender() == owner();
  }

  /// @dev Collect and distribute the primary sale value of NFTs being claimed.
  function _collectPriceOnClaim(
    address _primarySaleRecipient,
    uint256 _quantityToClaim,
    address _currency,
    uint256 _pricePerToken
  ) internal virtual {
    if (_pricePerToken == 0) {
      return;
    }

    uint256 totalPrice = _quantityToClaim * _pricePerToken;

    if (_currency == CurrencyTransfer.NATIVE_TOKEN) {
      require(
        msg.value == totalPrice,
        "ERC721SignatureMint: insufficient value"
      );
    }

    address saleRecipient = _primarySaleRecipient == address(0)
      ? primarySaleRecipient()
      : _primarySaleRecipient;

    CurrencyTransfer.transferCurrency(
      _currency,
      _msgSender(),
      saleRecipient,
      totalPrice
    );
  }
}
