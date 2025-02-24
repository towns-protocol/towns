package rpc

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"errors"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/nodes"
)

const (
	node2NodeCertName = "node2node"
)

var (
	// node2NodeCertExtOID is the OID of the custom node-2-node client certificate extension.
	node2NodeCertExtOID = asn1.ObjectIdentifier{1, 3, 6, 1, 4, 1, 50000, 1, 1}
)

// node2NodeCertExt is a custom extension for the node-2-node client certificates.
type node2NodeCertExt struct {
	// Address is the Ethereum address of the node.
	// The given address must correspond to the signature creator address.
	Address string `asn1:"utf8"`
	// Signature is the signature of the cert's public key.
	Signature []byte `asn1:"octet"`
}

// verifyNode2NodePeerCertificate goes through the peer certificates and verifies the node-2-node client certificate.
// Returns nil if the certificate is valid or not found.
func (s *Service) verifyNode2NodePeerCertificate(rawCerts [][]byte, _ [][]*x509.Certificate) error {
	for _, rawCert := range rawCerts {
		peerCert, err := x509.ParseCertificate(rawCert)
		if err != nil {
			return err
		}

		if peerCert.Subject.CommonName == node2NodeCertName {
			if err = verifyNode2NodeCert(s.nodeRegistry, peerCert); err != nil {
				return err
			}
		}
	}

	return nil
}

// requireNode2NodeCertMiddleware is a middleware that requires the node-2-node client certificate.
// This works together with verifyNode2NodePeerCertificate which verifies the certificate.
func requireNode2NodeCertMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var found bool
		for _, cert := range r.TLS.PeerCertificates {
			if cert.Subject.CommonName == node2NodeCertName {
				found = true
				break
			}
		}

		if !found {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// verifyNode2NodeCert verifies the node-2-node client certificate.
// The certificate must have a custom node2nodeCertExt extension.
func verifyNode2NodeCert(nodeRegistry nodes.NodeRegistry, cert *x509.Certificate) error {
	if cert == nil {
		return errors.New("no node-2-node client certificate provided")
	}

	if cert.Subject.CommonName != node2NodeCertName {
		return errors.New("unexpected node-2-node client certificate name")
	}

	now := time.Now()
	if cert.NotBefore.After(now) || cert.NotAfter.Before(now) {
		return errors.New("certificate expired")
	}

	publicKeyDER, err := x509.MarshalPKIXPublicKey(cert.PublicKey)
	if err != nil {
		return err
	}
	hash := crypto.Keccak256(publicKeyDER)

	var certExt node2NodeCertExt
	var found bool
	for _, ext := range cert.Extensions {
		if ext.Id.Equal(node2NodeCertExtOID) {
			if _, err := asn1.Unmarshal(ext.Value, &certExt); err != nil {
				return err
			}
			found = true
			break
		}
	}
	if !found {
		return errors.New("node-2-node cert extension not found")
	}

	sigPublicKey, err := crypto.SigToPub(hash, certExt.Signature)
	if err != nil {
		return err
	}
	recoveredAddr := crypto.PubkeyToAddress(*sigPublicKey)

	if recoveredAddr.Cmp(common.HexToAddress(certExt.Address)) != 0 {
		return errors.New("node-2-node cert signature does not match address")
	}

	node, err := nodeRegistry.GetNode(recoveredAddr)
	if err != nil {
		return err
	}

	if node.Status() != river.NodeStatus_Operational {
		return errors.New("node is not operational")
	}

	return nil
}

// node2nodeCertGetter returns a GetClientCertFunc that provides a node-2-node client certificate.
func node2nodeCertGetter(pk *ecdsa.PrivateKey) http_client.GetClientCertFunc {
	const (
		certTTL      = time.Hour * 24
		certRenewGap = time.Minute
	)

	var (
		lock sync.Mutex
		cert *tls.Certificate
		exp  time.Time
	)

	return func(info *tls.CertificateRequestInfo) (*tls.Certificate, error) {
		lock.Lock()
		defer lock.Unlock()

		if cert == nil || time.Now().Add(certRenewGap).After(exp) {
			newCert, err := node2nodeCreateCert(pk)
			if err != nil {
				return nil, err
			}

			cert = newCert
			exp = time.Now().Add(certTTL)
		}

		return cert, nil
	}
}

// node2nodeCreateCert creates a node-2-node client certificate.
// The certificate contains a custom extension with the node's address and a signature of the cert's public key.
func node2nodeCreateCert(pk *ecdsa.PrivateKey) (*tls.Certificate, error) {
	privateKeyA, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}

	publicKeyDER, err := x509.MarshalPKIXPublicKey(&privateKeyA.PublicKey)
	if err != nil {
		return nil, err
	}
	hash := crypto.Keccak256(publicKeyDER)

	signature, err := crypto.Sign(hash, pk)
	if err != nil {
		return nil, err
	}

	extensionValue, err := asn1.Marshal(node2NodeCertExt{
		Address:   crypto.PubkeyToAddress(pk.PublicKey).Hex(),
		Signature: signature,
	})
	if err != nil {
		return nil, err
	}

	template := &x509.Certificate{
		SerialNumber:    big.NewInt(1),
		Subject:         pkix.Name{CommonName: node2NodeCertName},
		NotBefore:       time.Now(),
		NotAfter:        time.Now().Add(time.Hour),
		KeyUsage:        x509.KeyUsageDigitalSignature,
		ExtKeyUsage:     []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		ExtraExtensions: []pkix.Extension{{Id: node2NodeCertExtOID, Value: extensionValue}},
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, template, privateKeyA.Public(), privateKeyA)
	if err != nil {
		return nil, err
	}

	cert, err := x509.ParseCertificate(certDER)
	if err != nil {
		return nil, err
	}

	return &tls.Certificate{
		Certificate: [][]byte{cert.Raw},
		PrivateKey:  privateKeyA,
	}, nil
}
