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

	"github.com/gammazero/workerpool"

	"github.com/towns-protocol/towns/core/node/protocol"
)

func testBotConversation(
	t *testing.T,
	numNodes int,
	numClients int,
	numBots int,
	numSteps int,
	maxWait time.Duration,
	checkInterval time.Duration,
) {
	tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{
		numNodes: numNodes,
		numBots:  numBots,
	})
	participants := tester.newTestClients(numClients, testClientOpts{
		enableSync: true,
	})

	spaceId, _ := participants[0].createSpace()
	channelId, syncCookie := participants.createChannelAndJoin(spaceId)

	tester.StartBotServices()
	tester.RegisterBotServices(protocol.ForwardSettingValue_FORWARD_SETTING_ALL_MESSAGES)

	botClients := tester.BotNodeTestClients(testClientOpts{enableSync: true})
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
		}

		botReplyPrefixes := make([]string, 0, len(stepMessages)*len(botClients))
		for msgIdx, messageText := range stepMessages {
			sender := participants[msgIdx]
			for range botClients {
				botReplyPrefixes = append(
					botReplyPrefixes,
					fmt.Sprintf("ChannelMessage session(%s) cipherText(%s)", sender.defaultSessionId, messageText),
				)
			}
		}

		workerPool := workerpool.New(10)
		// Expect all participants to observe all messages - both their own sent messages and bot replies.
		for _, pClient := range participants {
			workerPool.Submit(func() {
				pClient.eventually(func(tc *testClient) {
					userMessages := tc.getAllSyncedMessages(channelId)
					participantIDs := participants.userIds()

					foundParticipantMessages := make([]bool, len(stepMessages))
					foundBotReplies := make([]bool, len(botReplyPrefixes))
					messageUsed := make([]bool, len(userMessages))

					// Match participant messages first
					for participantIdx, expectedMsg := range stepMessages {
						for idx, um := range userMessages {
							if !messageUsed[idx] && um.message == expectedMsg &&
								slices.Contains(participantIDs, um.userId) {
								foundParticipantMessages[participantIdx] = true
								messageUsed[idx] = true
								break
							}
						}
					}

					// Then match bot replies
					for botIdx, expectedPrefix := range botReplyPrefixes {
						for actualIdx, actualUM := range userMessages {
							if !messageUsed[actualIdx] && strings.HasPrefix(actualUM.message, expectedPrefix) &&
								slices.Contains(botUserIDs, actualUM.userId) {
								foundBotReplies[botIdx] = true
								messageUsed[actualIdx] = true
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
							missingBotReplies = append(missingBotReplies, botReplyPrefixes[i])
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
								len(userMessages),
								userMessages,
								len(stepMessages),
								stepMessages,
								len(botReplyPrefixes),
								botReplyPrefixes,
							),
						)
					}
				}, maxWait, checkInterval)
			})
		}
		workerPool.StopWait()
		participants.clearUpdatesForChannel(channelId)
	}
}

func TestBotConversationNoRace(t *testing.T) {
	t.Parallel()

	t.Run("Small bot chat test", func(t *testing.T) {
		testBotConversation(t, 1, 3, 3, 5, 5*time.Second, 500*time.Millisecond)
	})

	t.Run("Medium bot chat test", func(t *testing.T) {
		testBotConversation(t, 3, 5, 5, 20, 20*time.Second, 1*time.Second)
	})

	t.Run("Large bot chat test", func(t *testing.T) {
		testBotConversation(t, 5, 10, 10, 50, 120*time.Second, 1*time.Second)
	})
}
