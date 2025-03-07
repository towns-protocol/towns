package node2nodeauth

import (
	"context"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"testing"
	"time"

	"github.com/towns-protocol/towns/core/contracts/river"

	"github.com/towns-protocol/towns/core/node/nodes"

	"github.com/towns-protocol/towns/core/node/testutils/mocks"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/node/crypto"
)

func TestCreateCert(t *testing.T) {
	logger := zap.NewNop().Sugar()

	wallet, err := crypto.NewWallet(context.Background())
	assert.NoError(t, err)

	cert, err := createCert(logger, wallet)
	assert.NoError(t, err)
	assert.NotNil(t, cert)

	// Check certificate fields
	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	assert.NoError(t, err)
	assert.Equal(t, node2NodeCertName, x509Cert.Subject.CommonName)
	assert.True(t, x509Cert.NotBefore.Before(time.Now()))
	assert.True(t, x509Cert.NotAfter.After(time.Now()))

	// Check custom extension
	var certExt node2NodeCertExt
	found := false
	for _, ext := range x509Cert.Extensions {
		if ext.Id.Equal(node2NodeCertExtOID) {
			_, err := asn1.Unmarshal(ext.Value, &certExt)
			assert.NoError(t, err)
			found = true
			break
		}
	}
	assert.True(t, found)
	assert.Equal(t, wallet.Address.Hex(), certExt.Address)
	assert.NotEmpty(t, certExt.Signature)
}

func TestCertGetter(t *testing.T) {
	logger := zap.NewNop().Sugar()

	wallet, err := crypto.NewWallet(context.Background())
	assert.NoError(t, err)

	getCertFunc := CertGetter(logger, wallet)

	// Test initial certificate creation
	cert, err := getCertFunc(nil)
	assert.NoError(t, err)
	assert.NotNil(t, cert)

	// Check certificate fields
	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	assert.NoError(t, err)
	assert.Equal(t, node2NodeCertName, x509Cert.Subject.CommonName)
	assert.True(t, x509Cert.NotBefore.Before(time.Now()))
	assert.True(t, x509Cert.NotAfter.After(time.Now()))

	// Test certificate renewal
	time.Sleep(time.Second * 2) // Simulate time passing
	cert, err = getCertFunc(nil)
	assert.NoError(t, err)
	assert.NotNil(t, cert)

	// Check renewed certificate fields
	x509Cert, err = x509.ParseCertificate(cert.Certificate[0])
	assert.NoError(t, err)
	assert.Equal(t, node2NodeCertName, x509Cert.Subject.CommonName)
	assert.True(t, x509Cert.NotBefore.Before(time.Now()))
	assert.True(t, x509Cert.NotAfter.After(time.Now()))
}

func TestVerifyCert(t *testing.T) {
	logger := zap.NewNop().Sugar()

	// Create test wallet
	wallet, err := crypto.NewWallet(context.Background())
	assert.NoError(t, err)

	cert, err := createCert(logger, wallet)
	assert.NoError(t, err)
	assert.NotNil(t, cert)

	x509Cert, err := x509.ParseCertificate(cert.Certificate[0])
	assert.NoError(t, err)

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
			name: "Invalid certificate name",
			cert: &x509.Certificate{
				Subject: pkix.Name{CommonName: "invalid-name"},
			},
			wantErr: true,
		},
		{
			name: "Expired certificate",
			cert: &x509.Certificate{
				Subject:    pkix.Name{CommonName: node2NodeCertName},
				NotBefore:  time.Now().Add(-2 * time.Hour),
				NotAfter:   time.Now().Add(-1 * time.Hour),
				Extensions: []pkix.Extension{{Id: node2NodeCertExtOID, Value: x509Cert.Extensions[0].Value}},
			},
			wantErr: true,
		},
		{
			name: "Invalid extension",
			cert: &x509.Certificate{
				Subject:    pkix.Name{CommonName: node2NodeCertName},
				NotBefore:  time.Now(),
				NotAfter:   time.Now().Add(time.Hour),
				Extensions: []pkix.Extension{{Id: node2NodeCertExtOID, Value: []byte("invalid")}},
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
