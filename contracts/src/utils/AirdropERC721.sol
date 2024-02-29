// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

// interfaces
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IAirdropERC721} from "./interfaces/IAirdropERC721.sol";

// libraries

// contracts
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Multicall} from "@openzeppelin/contracts/utils/Multicall.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract AirdropERC721 is
  Ownable,
  AccessControlEnumerable,
  ReentrancyGuard,
  Multicall,
  IAirdropERC721
{
  uint256 private _payeeCount;
  uint256 private _processedCount;
  uint[] private _indicesOfFailed;
  mapping(uint256 => Airdrop) private _airdrops;

  constructor() {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
  }

  /// @inheritdoc IAirdropERC721
  function addAirdropRecipients(
    Airdrop[] calldata recipients
  ) external onlyRole(DEFAULT_ADMIN_ROLE) {
    uint256 len = recipients.length;
    require(len > 0, "AirdropERC721: No recipients to add");

    uint256 currentCount = _payeeCount;
    _payeeCount += len;

    for (uint256 i = currentCount; i < len; i += 1) {
      _airdrops[i] = recipients[i];
    }

    emit RecipientAdded(recipients);
  }

  /// @inheritdoc IAirdropERC721
  function airdrop(uint256 paymentsToProcess) external nonReentrant {
    uint256 totalPayees = _payeeCount;
    uint256 countOfProcessed = _processedCount;

    require(
      countOfProcessed + paymentsToProcess <= totalPayees,
      "invalid no. of payments"
    );

    _processedCount += paymentsToProcess;

    for (
      uint256 i = countOfProcessed;
      i < (countOfProcessed + paymentsToProcess);
      i++
    ) {
      Airdrop memory content = _airdrops[i];

      IERC721(content.tokenAddress).safeTransferFrom(
        content.tokenOwner,
        content.recipient,
        content.tokenId
      );

      emit AirdropPayment(content.recipient, content);
    }
  }

  /// @inheritdoc IAirdropERC721
  function getAllAirdropPayments()
    external
    view
    override
    returns (Airdrop[] memory airdrops)
  {
    uint256 totalPayees = _payeeCount;
    airdrops = new Airdrop[](totalPayees);

    for (uint256 i = 0; i < totalPayees; i++) {
      airdrops[i] = _airdrops[i];
    }
  }

  /// @inheritdoc IAirdropERC721
  function getallAirdropPaymentsPending()
    external
    view
    override
    returns (Airdrop[] memory airdrops)
  {
    uint256 totalPayees = _payeeCount;
    uint256 processed = _processedCount;

    airdrops = new Airdrop[](totalPayees - processed);

    uint256 index = 0;
    for (uint256 i = processed; i < totalPayees; i++) {
      airdrops[index] = _airdrops[i];
      index++;
    }
  }

  /// @inheritdoc IAirdropERC721
  function getallAirdropPaymentsProcessed()
    external
    view
    override
    returns (Airdrop[] memory airdrops)
  {
    uint256 processed = _processedCount;
    airdrops = new Airdrop[](processed);

    for (uint256 i = 0; i < processed; i++) {
      airdrops[i] = _airdrops[i];
    }
  }

  /// @inheritdoc IAirdropERC721
  function getallAirdropPaymentsFailed()
    external
    view
    override
    returns (Airdrop[] memory airdrops)
  {
    uint256 count = _indicesOfFailed.length;
    airdrops = new Airdrop[](count);

    for (uint256 i = 0; i < count; i++) {
      airdrops[i] = _airdrops[_indicesOfFailed[i]];
    }
  }
}
