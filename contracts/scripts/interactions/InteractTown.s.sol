// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IChannelBase} from "contracts/src/towns/facets/channels/IChannel.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {EntitlementsManager} from "contracts/src/towns/facets/entitlements/EntitlementsManager.sol";
import {TokenOwnableFacet} from "contracts/src/diamond/facets/ownable/token/TokenOwnableFacet.sol";
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract InteractTown is Interaction, IChannelBase {
  function __interact(uint256, address) public view override {
    address town = 0x475a329dE3671c287B2193def20e59E934F764B4;

    EntitlementsManager entitlementsManager = EntitlementsManager(town);
    TokenOwnableFacet tokenOwnableFacet = TokenOwnableFacet(town);
    Channels channels = Channels(town);

    console.log("owner", tokenOwnableFacet.owner());

    bool entitledToTown = entitlementsManager.isEntitledToTown(
      tokenOwnableFacet.owner(),
      "Read"
    );
    bool entitledToChannel = entitlementsManager.isEntitledToChannel(
      "22-KICIpTH5cAwWo2yYULPuM",
      tokenOwnableFacet.owner(),
      "Read"
    );

    console.log("entitledToTown: %s", entitledToTown);
    console.log("entitledToChannel: %s", entitledToChannel);

    Channel memory channel = channels.getChannel("22-KICIpTH5cAwWo2yYULPuM");
    console.log("channel id", channel.id);
    console.log("channel name", channel.metadata);
    console.log("channel disabled", channel.disabled);
  }
}
