package test

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/nodes"
	"casablanca/node/testutils"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

type expectPayload struct {
	authToken     string
	channelId     string
	sender        string
	spaceId       string
	url           string
	usersToNotify []string
}

func createTestServer(
	t *testing.T,
	expectPayload *expectPayload,
) (*httptest.Server, chan int) {
	c := make(chan int)
	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		defer close(c)
		var n nodes.NotificationRequestParams
		bearerToken := fmt.Sprintf("Bearer %s", expectPayload.authToken)
		err := json.NewDecoder(req.Body).Decode(&n)
		assert.NoError(t, err)
		// assert the headers
		assert.Equal(t, expectPayload.url, req.URL.Path)
		assert.Equal(t, "POST", req.Method)
		assert.Equal(t, "application/json", req.Header.Get("Content-Type"))
		assert.Equal(t, bearerToken, req.Header.Get("Authorization"))
		// assert the body payload
		assert.Equal(t, expectPayload.channelId, n.ChannelId)
		assert.Equal(t, expectPayload.sender, n.Sender)
		assert.Equal(t, expectPayload.spaceId, n.SpaceId)
		assert.ElementsMatch(t, expectPayload.usersToNotify, n.Users)
		// Send back the response
		rw.WriteHeader(http.StatusOK)
		c <- 0 // signal that the server is done
	}))
	return server, c
}

func TestPushNotification_JoinedMembers(t *testing.T) {
	/* Arrange */
	ctx := context.Background()
	wallet, _ := crypto.NewWallet(ctx)
	alice := "alice"
	others := []string{"bob", "carol"}
	spaceStreamId := "space_1_streamId"
	channelStreamId := "channel_1_streamId"
	// create a channel stream
	t_context := testutils.MakeChannelStreamContext_T(
		t,
		ctx,
		wallet,
		alice,
		channelStreamId,
		spaceStreamId,
	)
	// add others to the channel
	t_context = testutils.JoinChannel_T(
		t_context,
		wallet,
		others,
	)
	// create a push notification config and the test server
	authToken := "test"
	expectPayload := &expectPayload{
		authToken:     authToken,
		channelId:     channelStreamId,
		sender:        alice,
		spaceId:       spaceStreamId,
		url:           "/api/notify-users",
		usersToNotify: others,
	}
	server, c := createTestServer(t, expectPayload)
	defer server.Close()
	cfg := config.PushNotificationConfig{
		Url:       server.URL,
		AuthToken: authToken,
	}

	/* Act */
	notification := nodes.MakePushNotification(
		ctx,
		&cfg,
	)
	// send a push notification
	notification.SendPushNotification(
		t_context.Context,
		t_context.StreamView,
		alice,
	)
	// wait for server to finish
	<-c

	/* Assert */
	// assertions are done in the test server
}

func TestPushNotification_RemainingMembers(t *testing.T) {
	/* Arrange */
	ctx := context.Background()
	wallet, _ := crypto.NewWallet(ctx)
	alice := "alice"
	others := []string{"bob", "carol"}
	spaceStreamId := "space_1_streamId"
	channelStreamId := "channel_1_streamId"
	// create a channel stream
	t_context := testutils.MakeChannelStreamContext_T(
		t,
		ctx,
		wallet,
		alice,
		channelStreamId,
		spaceStreamId,
	)
	// add others to the channel
	t_context = testutils.JoinChannel_T(
		t_context,
		wallet,
		others,
	)
	// create a push notification config and the test server
	authToken := "test"
	expectPayload := &expectPayload{
		authToken:     authToken,
		channelId:     channelStreamId,
		sender:        alice,
		spaceId:       spaceStreamId,
		url:           "/api/notify-users",
		usersToNotify: []string{"carol"}, // because bob left the channel
	}
	server, c := createTestServer(t, expectPayload)
	defer server.Close()
	cfg := config.PushNotificationConfig{
		Url:       server.URL,
		AuthToken: authToken,
	}

	/* Act */
	// one person leaves the channel
	t_context = testutils.LeaveChannel_T(
		t_context,
		wallet,
		[]string{"bob"},
	)
	notification := nodes.MakePushNotification(
		ctx,
		&cfg,
	)
	// send a push notification
	notification.SendPushNotification(
		t_context.Context,
		t_context.StreamView,
		alice,
	)
	// wait for server to finish
	<-c

	/* Assert */
	// assertions are done in the test server
}
