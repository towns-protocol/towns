package test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/nodes"
	"github.com/river-build/river/shared"
	"github.com/river-build/river/testutils"

	"github.com/stretchr/testify/assert"
)

type expectPayload struct {
	authToken     string
	channelId     string
	kind          nodes.NotificationKind
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
		bearerToken := fmt.Sprintf("Bearer %s", expectPayload.authToken)
		// assert the headers
		assert.Equal(t, expectPayload.url, req.URL.Path)
		assert.Equal(t, "POST", req.Method)
		assert.Equal(t, "application/json", req.Header.Get("Content-Type"))
		assert.Equal(t, bearerToken, req.Header.Get("Authorization"))
		// assert the body payload
		body, err := io.ReadAll(req.Body)
		assert.NoError(t, err)
		assertPayload(t, expectPayload, body)
		// Send back the response
		rw.WriteHeader(http.StatusOK)
		c <- 0 // signal that the server is done
	}))
	return server, c
}

func assertPayload(
	t *testing.T,
	expectPayload *expectPayload,
	data []byte,
) {
	var v map[string]any
	err := json.Unmarshal(data, &v)
	assert.NoError(t, err)
	// assert the json matches the NotificationRequestParams struct
	assert.Equal(t, expectPayload.sender, v["sender"].(string))
	users := v["users"].([]any)
	assertRecipients(t, expectPayload.usersToNotify, users)
	payload := v["payload"].(map[string]any)
	content := payload["content"].(map[string]any)
	kind := content["kind"].(string)
	switch kind {
	case nodes.NewMessage.String():
		assert.Equal(t, expectPayload.kind.String(), kind)
		assert.Equal(t, expectPayload.spaceId, content["spaceId"].(string))
		assert.Equal(t, expectPayload.channelId, content["channelId"].(string))
		assert.Equal(t, expectPayload.sender, content["senderId"].(string))
		event := content["event"].(map[string]any)
		assertEvent(t, event)
	case nodes.DirectMessage.String():
		assert.Equal(t, expectPayload.kind.String(), kind)
		nilSpaceId := content["spaceId"]
		assert.Nil(t, nilSpaceId, "direct messages should not have a spaceId")
		assert.Equal(t, expectPayload.channelId, content["channelId"].(string))
		assert.Equal(t, expectPayload.sender, content["senderId"].(string))
		recipients := content["recipients"].([]any)
		assertRecipients(t, expectPayload.usersToNotify, recipients)
		event := content["event"].(map[string]any)
		assertEvent(t, event)
	default:
		assert.Failf(t, "unknown notification kind: %s", kind)
	}
}

func assertRecipients(
	t *testing.T,
	expectRecipients []string,
	data []any,
) {
	var users []string
	for _, u := range data {
		users = append(users, u.(string))
	}
	assert.ElementsMatch(t, expectRecipients, users)
}

func assertEvent(
	t *testing.T,
	event map[string]any,
) {
	assert.NotNil(t, event)
	assert.NotNil(t, event["creator_address"])
	assert.NotNil(t, event["salt"])
	assert.NotNil(t, event["prev_miniblock_hash"])
	assert.NotNil(t, event["Payload"])
	payload := event["Payload"].(map[string]any)
	assert.NotNil(t, payload)
	assert.NotNil(t, payload["ChannelPayload"])
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
		kind:          nodes.NewMessage,
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
	// post a new message
	parsedEvent, _ := testutils.PostMessage_T(
		t_context,
		wallet,
		"hello",
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
		parsedEvent.Event,
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
		kind:          nodes.NewMessage,
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
	// post a new message
	parsedEvent, _ := testutils.PostMessage_T(
		t_context,
		wallet,
		"hello",
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
		parsedEvent.Event,
	)
	// wait for server to finish
	<-c

	/* Assert */
	// assertions are done in the test server
}

func TestPushNotification_Dm(t *testing.T) {
	/* Arrange */
	ctx := context.Background()
	wallet, _ := crypto.NewWallet(ctx)
	alice := "alice"
	others := []string{"bob", "carol"}
	spaceStreamId := ""
	channelStreamId := shared.STREAM_GDM_CHANNEL_PREFIX_DASH + "_channel_1_streamId"
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
		kind:          nodes.DirectMessage,
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
	// post a new message
	parsedEvent, _ := testutils.PostMessage_T(
		t_context,
		wallet,
		"hello",
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
		parsedEvent.Event,
	)
	// wait for server to finish
	<-c

	/* Assert */
	// assertions are done in the test server
}
