package node2nodeauth

import (
	"context"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

func TestCreateCert(t *testing.T) {
	logger := logging.DefaultZapLogger(zap.DebugLevel)

	wallet, err := crypto.NewWallet(context.Background())
	require.NoError(t, err)

	cert, err := createCert(logger, wallet, big.NewInt(1))
	require.NoError(t, err)
	require.NotNil(t, cert)

	// Check certificate fields
	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)
	require.Equal(t, fmt.Sprintf("1.%s.towns", wallet.Address.Hex()), x509Cert.Subject.CommonName)
	require.True(t, x509Cert.NotBefore.Before(time.Now()))
	require.True(t, x509Cert.NotAfter.After(time.Now()))

	// Check custom extension
	var certExt node2NodeCertExt
	found := false
	for _, ext := range x509Cert.Extensions {
		if ext.Id.Equal(certExtOID) {
			_, err := asn1.Unmarshal(ext.Value, &certExt)
			require.NoError(t, err)
			found = true
			break
		}
	}
	require.True(t, found)
	require.Equal(t, wallet.Address.Hex(), certExt.Address)
	require.NotEmpty(t, certExt.Signature)
}

func TestCertGetter(t *testing.T) {
	logger := logging.DefaultZapLogger(zap.DebugLevel)

	wallet, err := crypto.NewWallet(context.Background())
	require.NoError(t, err)

	getCertFunc := CertGetter(logger, wallet, big.NewInt(1))

	// Test initial certificate creation
	cert, err := getCertFunc(nil)
	require.NoError(t, err)
	require.NotNil(t, cert)

	// Check certificate fields
	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)
	require.Equal(t, fmt.Sprintf("1.%s.towns", wallet.Address.Hex()), x509Cert.Subject.CommonName)
	require.True(t, x509Cert.NotBefore.Before(time.Now()))
	require.True(t, x509Cert.NotAfter.After(time.Now()))

	// Test certificate renewal
	time.Sleep(time.Second * 2) // Simulate time passing
	cert, err = getCertFunc(nil)
	require.NoError(t, err)
	require.NotNil(t, cert)

	// Check renewed certificate fields
	x509Cert, err = x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)
	require.Equal(t, fmt.Sprintf("1.%s.towns", wallet.Address.Hex()), x509Cert.Subject.CommonName)
	require.True(t, x509Cert.NotBefore.Before(time.Now()))
	require.True(t, x509Cert.NotAfter.After(time.Now()))
}

func TestVerifyCert(t *testing.T) {
	logger := logging.DefaultZapLogger(zap.DebugLevel)

	// Create test wallet
	wallet, err := crypto.NewWallet(context.Background())
	require.NoError(t, err)

	cert, err := createCert(logger, wallet, big.NewInt(1))
	require.NoError(t, err)
	require.NotNil(t, cert)

	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	require.NoError(t, err)

	// Mock node registry
	nodeRegistry := mocks.NewMockNodeRegistry(t)
	nodeRegistry.On("GetNode", wallet.Address).Return(
		nodes.NewNodeRecord(wallet.Address, wallet.Address, "", river.NodeStatus_Operational, false, nil, nil),
		nil,
	)

	tests := []struct {
		name    string
		cert    *x509.Certificate
		wantErr bool
	}{
		{
			name:    "Valid certificate",
			cert:    x509Cert,
			wantErr: false,
		},
		{
			name: "Expired certificate",
			cert: &x509.Certificate{
				NotBefore:  time.Now().Add(-2 * time.Hour),
				NotAfter:   time.Now().Add(-1 * time.Hour),
				Extensions: []pkix.Extension{{Id: certExtOID, Value: x509Cert.Extensions[0].Value}},
			},
			wantErr: true,
		},
		{
			name: "Invalid extension",
			cert: &x509.Certificate{
				NotBefore:  time.Now(),
				NotAfter:   time.Now().Add(time.Hour),
				Extensions: []pkix.Extension{{Id: certExtOID, Value: []byte("invalid")}},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := verifyCert(logger, nodeRegistry, tt.cert)
			if (err != nil) != tt.wantErr {
				t.Errorf("verifyCert() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
