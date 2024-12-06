// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IArchitect} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IRiverPoints} from "./IRiverPoints.sol";

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {RiverPointsStorage} from "./RiverPointsStorage.sol";
import {CheckIn} from "./CheckIn.sol";

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract RiverPoints is IERC20Metadata, IRiverPoints, OwnableBase, Facet {
  function __RiverPoints_init(address spaceFactory) external onlyInitializing {
    RiverPointsStorage.Layout storage ds = RiverPointsStorage.layout();
    ds.spaceFactory = spaceFactory;
    _addInterface(type(IERC20).interfaceId);
    _addInterface(type(IERC20Metadata).interfaceId);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           POINTS                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  modifier onlySpace() {
    address spaceFactory = RiverPointsStorage.layout().spaceFactory;
    if (IArchitect(spaceFactory).getTokenIdBySpace(msg.sender) == 0) {
      CustomRevert.revertWith(RiverPoints__InvalidSpace.selector);
    }
    _;
  }

  /// @inheritdoc IRiverPoints
  function batchMintPoints(
    address[] calldata accounts,
    uint256[] calldata values
  ) external onlyOwner {
    if (accounts.length != values.length) {
      CustomRevert.revertWith(RiverPoints__InvalidArrayLength.selector);
    }

    RiverPointsStorage.Layout storage self = RiverPointsStorage.layout();
    for (uint256 i; i < accounts.length; ++i) {
      self.inner.mint(accounts[i], values[i]);
    }
  }

  /// @inheritdoc IRiverPoints
  function getPoints(
    Action action,
    bytes calldata data
  ) external pure returns (uint256 points) {
    if (action == Action.JoinSpace) {
      uint256 protocolFee = abi.decode(data, (uint256));
      if (protocolFee <= 0.0003 ether) {
        points = protocolFee * 1_000_000;
      } else if (protocolFee <= 0.001 ether) {
        points = protocolFee * 2_000_000;
      } else {
        points = protocolFee * 3_000_000;
      }
    }

    if (action == Action.CheckIn) {
      (uint256 lastCheckIn, uint256 streak, uint256 currentTime) = abi.decode(
        data,
        (uint256, uint256, uint256)
      );
      (points, ) = CheckIn.getPointsAndStreak(lastCheckIn, streak, currentTime);
    }
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           CHECKIN                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IRiverPoints
  function checkIn() external {
    CheckIn.CheckInData storage userCheckIn = CheckIn
      .layout()
      .checkInsByAddress[msg.sender];

    (uint256 pointsToAward, uint256 newStreak) = CheckIn.getPointsAndStreak(
      userCheckIn.lastCheckIn,
      userCheckIn.streak,
      block.timestamp
    );

    // Must wait at least 24 hours between check-ins
    if (pointsToAward == 0 && newStreak == 0) {
      CustomRevert.revertWith(RiverPoints__CheckInPeriodNotPassed.selector);
    }

    (userCheckIn.streak, userCheckIn.lastCheckIn) = (
      newStreak,
      block.timestamp
    );
    RiverPointsStorage.layout().inner.mint(msg.sender, pointsToAward);
    emit CheckedIn(msg.sender, pointsToAward, newStreak, block.timestamp);
  }

  /// @inheritdoc IRiverPoints
  function getCurrentStreak(address user) external view returns (uint256) {
    return CheckIn.getCurrentStreak(user);
  }

  /// @inheritdoc IRiverPoints
  function getLastCheckIn(address user) external view returns (uint256) {
    return CheckIn.getLastCheckIn(user);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           ERC20                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IERC20
  function approve(address spender, uint256 value) external returns (bool) {
    RiverPointsStorage.layout().inner.approve(spender, value);
    return true;
  }

  /// @inheritdoc IRiverPoints
  function mint(address to, uint256 value) external onlySpace {
    RiverPointsStorage.layout().inner.mint(to, value);
  }

  /// @inheritdoc IERC20
  function transfer(address to, uint256 value) external returns (bool) {
    RiverPointsStorage.layout().inner.transfer(to, value);
    return true;
  }

  /// @inheritdoc IERC20
  function transferFrom(
    address from,
    address to,
    uint256 value
  ) external returns (bool) {
    RiverPointsStorage.layout().inner.transferFrom(from, to, value);
    return true;
  }

  /// @inheritdoc IERC20
  function allowance(
    address owner,
    address spender
  ) external view returns (uint256) {
    return RiverPointsStorage.layout().inner.allowance(owner, spender);
  }

  /// @inheritdoc IERC20
  function balanceOf(address account) external view returns (uint256) {
    return RiverPointsStorage.layout().inner.balanceOf(account);
  }

  /// @inheritdoc IERC20
  function totalSupply() external view returns (uint256) {
    return RiverPointsStorage.layout().inner.totalSupply;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       ERC20 METADATA                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IERC20Metadata
  function name() external pure returns (string memory) {
    return "Beaver Points";
  }

  /// @inheritdoc IERC20Metadata
  function symbol() external pure returns (string memory) {
    return "BVRP";
  }

  /// @inheritdoc IERC20Metadata
  function decimals() public pure virtual returns (uint8) {
    return 18;
  }
}
