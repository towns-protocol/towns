// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";

contract ChannelsHelper is FacetHelper {
  Channels internal channels;

  constructor() {
    channels = new Channels();
  }

  function deploy() public returns (address) {
    channels = new Channels();
    return address(channels);
  }

  function facet() public view override returns (address) {
    return address(channels);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](7);
    selectors_[0] = IChannel.createChannel.selector;
    selectors_[1] = IChannel.getChannel.selector;
    selectors_[2] = IChannel.getChannels.selector;
    selectors_[3] = IChannel.updateChannel.selector;
    selectors_[4] = IChannel.removeChannel.selector;
    selectors_[5] = IChannel.addRoleToChannel.selector;
    selectors_[6] = IChannel.removeRoleFromChannel.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
