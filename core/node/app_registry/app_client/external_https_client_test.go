package app_client

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/http_client"
	"golang.org/x/net/http2"
)

func TestExternalHttpsClient(t *testing.T) {
	ctx := test.NewTestContext(t)
	http1Client, err := http_client.GetHttp11Client(ctx)
	require.NoError(t, err)

	http2Client := &http.Client{
		Transport: &http2.Transport{},
	}

	tests := map[string]struct {
		baseClient  *http.Client
		url         string
		expectedErr string
	}{
		"Failure: http1 client with http url": {
			baseClient:  http1Client,
			url:         "http://www.cnn.com",
			expectedErr: "only HTTPS requests are allowed",
		},
		"Failure: http1 client with redirect": {
			baseClient:  http1Client,
			url:         "https://google.com", // should redirect to the http://www.google.com address
			expectedErr: "redirects disallowed",
		},
		"Failure: http1 client with loopback": {
			baseClient:  http1Client,
			url:         "https://localhost",
			expectedErr: "connection to loopback address is not allowed",
		},
		"Failure: http1 client with private ip": {
			baseClient:  http1Client,
			url:         "https://192.168.0.0",
			expectedErr: "connection to private ip address is not allowed",
		},
		"Failure: http1 client with 127.0.0.1": {
			baseClient:  http1Client,
			url:         "https://127.0.0.1",
			expectedErr: "connection to loopback address is not allowed",
		},
		"Success: http1 https://google.com": {
			baseClient: http1Client,
			url:        "https://www.google.com",
		},
		"Failure: http2 client with http url": {
			baseClient:  http2Client,
			url:         "http://www.cnn.com",
			expectedErr: "only HTTPS requests are allowed",
		},
		"Failure: http2 client with redirect": {
			baseClient:  http2Client,
			url:         "https://google.com", // should redirect to the http://www.google.com address
			expectedErr: "redirects disallowed",
		},
		"Failure: http2 client with loopback": {
			baseClient:  http2Client,
			url:         "https://localhost",
			expectedErr: "connection to loopback address is not allowed",
		},
		"Failure: http2 client with private ip": {
			baseClient:  http2Client,
			url:         "https://192.168.0.0",
			expectedErr: "connection to private ip address is not allowed",
		},
		"Failure: http2 client with 127.0.0.1": {
			baseClient:  http2Client,
			url:         "https://127.0.0.1",
			expectedErr: "connection to loopback address is not allowed",
		},
		"Success: http2 https://google.com": {
			baseClient: http2Client,
			url:        "https://www.google.com",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			wrapped := NewExternalHttpsClient(tc.baseClient)
			resp, err := wrapped.Get(tc.url)
			if resp != nil {
				defer resp.Body.Close()
			}

			if tc.expectedErr == "" {
				require.NoError(t, err)
				require.NotNil(t, resp)
			} else {
				require.ErrorContains(t, err, tc.expectedErr)
				require.Nil(t, resp)
			}
		})
	}
}
