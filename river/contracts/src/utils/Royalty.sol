// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {IRoyalty, IERC2981} from "contracts/src/utils/interfaces/IRoyalty.sol";
import {ERC165, IERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

abstract contract Royalty is IRoyalty, ERC165 {
  RoyaltyInfo private _defaultRoyaltyInfo;
  mapping(uint256 => RoyaltyInfo) private _tokenRoyaltyInfo;

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(IERC165, ERC165) returns (bool) {
    return
      interfaceId == type(IERC2981).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  /// @inheritdoc IERC2981
  function royaltyInfo(
    uint256 tokenId,
    uint256 salePrice
  ) public view virtual override returns (address, uint256) {
    RoyaltyInfo memory royalty = getRoyaltyInfoForToken(tokenId);

    uint256 royaltyAmount = (salePrice * royalty.amount) / _feeDenominator();

    return (royalty.receiver, royaltyAmount);
  }

  /// @inheritdoc IRoyalty
  function getDefaultRoyaltyInfo()
    public
    view
    override
    returns (RoyaltyInfo memory _royalty)
  {
    return _defaultRoyaltyInfo;
  }

  /// @inheritdoc IRoyalty
  function getRoyaltyInfoForToken(
    uint256 _tokenId
  ) public view override returns (RoyaltyInfo memory _royalty) {
    RoyaltyInfo memory royalty = _tokenRoyaltyInfo[_tokenId];

    return royalty.receiver == address(0) ? _defaultRoyaltyInfo : royalty;
  }

  /// @inheritdoc IRoyalty
  function setDefaultRoyaltyInfo(
    address _recipient,
    uint256 _amount
  ) external override {
    if (!_canSetRoyaltyInfo()) {
      revert("Royalty: not authorized");
    }

    _setDefaultRoyaltyInfo(_recipient, _amount);
  }

  /// @inheritdoc IRoyalty
  function setRoyaltyInfoForToken(
    uint256 _tokenId,
    address _recipient,
    uint256 _amount
  ) external override {
    if (!_canSetRoyaltyInfo()) {
      revert("Royalty: not authorized");
    }

    _setRoyaltyInfoForToken(_tokenId, _recipient, _amount);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /// @dev Returns the denominator for the royalty fee.
  function _feeDenominator() internal pure virtual returns (uint96) {
    return 10_000;
  }

  /// @dev Sets the royalty info for a given token id.
  function _setRoyaltyInfoForToken(
    uint256 _tokenId,
    address _recipient,
    uint256 _amount
  ) internal {
    require(
      _amount <= _feeDenominator(),
      "Royalty: royalty fee will exceed salePrice"
    );
    require(_recipient != address(0), "Royalty: invalid receiver");

    _tokenRoyaltyInfo[_tokenId] = RoyaltyInfo(_recipient, _amount);

    emit RoyaltyForToken(_tokenId, _recipient, _amount);
  }

  /// @dev Sets the default royalty info.
  function _setDefaultRoyaltyInfo(
    address _recipient,
    uint256 _amount
  ) internal {
    require(
      _amount <= _feeDenominator(),
      "Royalty: royalty fee will exceed salePrice"
    );
    require(_recipient != address(0), "Royalty: invalid receiver");

    _defaultRoyaltyInfo = RoyaltyInfo(_recipient, _amount);

    emit DefaultRoyalty(_recipient, _amount);
  }

  /// @dev Deletes the default royalty info.
  function _deleteDefaultRoyalty() internal virtual {
    delete _defaultRoyaltyInfo;
  }

  /// @dev Deletes the royalty info for a given token id.
  function _resetTokenRoyalty(uint256 tokenId) internal virtual {
    delete _tokenRoyaltyInfo[tokenId];
  }

  /// @dev Returns whether royalty info can be set in the given execution context.
  function _canSetRoyaltyInfo() internal view virtual returns (bool);
}
