//go:build !race

// This file contains tests that are skipped when the race detector is enabled
// because they are too resource-intensive.

package rpc

import (
	"fmt"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/towns-protocol/towns/core/node/protocol"
)

func testBotConversation(
	t *testing.T,
	numNodes int,
	numClients int,
	numBots int,
	numSteps int,
	maxWait time.Duration,
	listenInterval time.Duration,
) {
	tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{
		numNodes: numNodes,
		numBots:  numBots,
	})
	participants := tester.newTestClients(numClients, testClientOpts{
		enableSync: true,
	})
	t.Logf("Participants: %v", participants.userIds())

	spaceId, _ := participants[0].createSpace()
	channelId, syncCookie := participants.createChannelAndJoin(spaceId)

	tester.StartBotServices()
	tester.RegisterBotServices(protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)

	botClients := tester.BotNodeTestClients(testClientOpts{enableSync: true})
	t.Logf("botClients: %v", botClients.userIds())

	botClients.joinChannel(spaceId, channelId, syncCookie, participants)

	botUserIDs := botClients.userIds()

	for step := range numSteps {
		stepMessages := make([]string, len(participants))
		for j := range participants {
			stepMessages[j] = fmt.Sprintf("step %d; sender(%v)", step, j)
		}
		participants.say(channelId, stepMessages...)

		if step == 0 {
			participants.waitForKeySolicitationsFrom(t, channelId, botClients)
			participants.sendSolicitationResponsesTo(channelId, botClients)
			time.Sleep(5 * time.Second) // TODO: remove these waits
		} else {
			// Allow time for bots to reply to messages in subsequent steps
			time.Sleep(2 * time.Second)
		}

		expectedReplyPrefixes := make([]string, 0, len(stepMessages)*len(botClients))
		for msgIdx, messageText := range stepMessages {
			sender := participants[msgIdx]
			for range botClients { // One reply expected from each bot to this message
				expectedReplyPrefixes = append(
					expectedReplyPrefixes,
					fmt.Sprintf("ChannelMessage session(%s) cipherText(%s)", sender.defaultSessionId, messageText),
				)
			}
		}

		for _, pClient := range participants {
			pClient.eventually(func(tc *testClient) {
				actualUserMessages := tc.getAllSyncedMessages(channelId)
				participantIDs := participants.userIds()

				foundParticipantMessages := make([]bool, len(stepMessages))
				foundBotReplies := make([]bool, len(expectedReplyPrefixes))
				actualMessageUsed := make([]bool, len(actualUserMessages))

				// Match participant messages first
				for expectedIdx, expectedMsg := range stepMessages {
					for actualIdx, actualUM := range actualUserMessages {
						if !actualMessageUsed[actualIdx] && actualUM.message == expectedMsg &&
							slices.Contains(participantIDs, actualUM.userId) {
							foundParticipantMessages[expectedIdx] = true
							actualMessageUsed[actualIdx] = true
							break
						}
					}
				}

				// Then match bot replies
				for expectedIdx, expectedPrefix := range expectedReplyPrefixes {
					for actualIdx, actualUM := range actualUserMessages {
						if !actualMessageUsed[actualIdx] && strings.HasPrefix(actualUM.message, expectedPrefix) &&
							slices.Contains(botUserIDs, actualUM.userId) {
							foundBotReplies[expectedIdx] = true
							actualMessageUsed[actualIdx] = true
							break
						}
					}
				}

				missingParticipantMessages := []string{}
				for i, found := range foundParticipantMessages {
					if !found {
						missingParticipantMessages = append(missingParticipantMessages, stepMessages[i])
					}
				}

				missingBotReplies := []string{}
				for i, found := range foundBotReplies {
					if !found {
						missingBotReplies = append(missingBotReplies, expectedReplyPrefixes[i])
					}
				}

				if len(missingParticipantMessages) > 0 || len(missingBotReplies) > 0 {
					tc.assert.Fail(
						fmt.Sprintf(
							"Client %s (user ID: %s) at step %d validation failed.\nMissing Participant Messages: %v\nMissing Bot Reply Prefixes: %v\nSaw %d messages: %v\nExpected %d participant messages: %v\nExpected %d bot replies: %v",
							tc.name,
							tc.userId.Hex(),
							step,
							missingParticipantMessages,
							missingBotReplies,
							len(actualUserMessages),
							actualUserMessages,
							len(stepMessages),
							stepMessages,
							len(expectedReplyPrefixes),
							expectedReplyPrefixes,
						),
					)
				}
			}, maxWait, listenInterval)
		}
	}
}

func TestBotConversationNoRace(t *testing.T) {
	// t.Parallel()
	testBotConversation(t, 5, 10, 10, 5, 10*time.Second, 500*time.Millisecond)
}
