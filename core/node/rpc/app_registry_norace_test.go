//go:build !race

// This file contains tests that are skipped when the race detector is enabled
// because they are too resource-intensive.

package rpc

import (
	"testing"

	"github.com/towns-protocol/towns/core/node/protocol"
)

func testBotConversation(
	t *testing.T,
	numNodes int,
	numClients int,
	numBots int,
	numSteps int,
	listenInterval int,
	compareInterval int,
) {
	tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{
		numNodes:            numNodes,
		numBots:             numBots,
		enableAppServerLogs: true,
	})
	participants := tester.newTestClients(numClients, testClientOpts{})
	t.Logf("Participants: %v", participants.userIds())

	spaceId, _ := participants[0].createSpace()
	channelId, syncCookie := participants.createChannelAndJoin(spaceId)
	t.Logf("All participants joined channel")

	tester.StartBotServices()

	tester.RegisterBotServices(protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)
	t.Log("Registered bot services")

	botClients := tester.BotNodeTestClients(testClientOpts{})
	t.Logf("botClients: %v", botClients.userIds())
	botClients.joinChannel(spaceId, channelId, syncCookie, participants)

	// for i := range numSteps {
	// 	participants.say(channelId, fmt.Sprintf("step %d", i))
	// }

	// participants.requireKeySolicitationFromClients(channelId, *botClients)
}

func TestBotConversationNoRace(t *testing.T) {
	// t.Parallel()
	testBotConversation(t, 1, 1, 1, 1, 1000, 1000)
}
