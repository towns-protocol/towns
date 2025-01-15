use std::collections::HashSet;

use mls_rs::extension::built_in::ExternalPubExt;
use mls_rs::external_client::*;
use mls_rs::group::proposal::Proposal;
use mls_rs::group::CommitEffect;
use mls_rs::MlsMessage;
use mls_rs::external_client::builder::ExternalBaseConfig;
use mls_rs::external_client::builder::WithCryptoProvider as ExternalWithCryptoProvider;
use mls_rs::external_client::builder::WithIdentityProvider as ExternalWithIdentityProvider;
use mls_rs::external_client::ExternalClient;
use mls_rs::identity::basic::BasicIdentityProvider;
use mls_rs_crypto_rustcrypto::RustCryptoProvider;

use river_mls_protocol::KeyPackageRequest;
use river_mls_protocol::KeyPackageResponse;
use river_mls_protocol::SnapshotExternalGroupRequest;
use river_mls_protocol::SnapshotExternalGroupResponse;
use river_mls_protocol::WelcomeMessageRequest;
use river_mls_protocol::WelcomeMessageResponse;
use river_mls_protocol::{InitialGroupInfoRequest, 
    InitialGroupInfoResponse, 
    ExternalJoinRequest, 
    ExternalJoinResponse, 
    ValidationResult
};

type ExternalConfig = ExternalWithIdentityProvider<
    BasicIdentityProvider,
    ExternalWithCryptoProvider<RustCryptoProvider, ExternalBaseConfig>,
>;

fn create_external_client() -> ExternalClient<ExternalConfig> {
    let crypto_provider = RustCryptoProvider::default();
    let external_client = ExternalClient::builder()
        .identity_provider(BasicIdentityProvider)
        .crypto_provider(crypto_provider)
        .build();
    return external_client
}

fn validate_group_info_message(group_info_message_bytes: Vec<u8>, expected_epoch: u64, expected_group_id: &[u8]) -> ValidationResult {
    let group_info_message = match MlsMessage::from_bytes(&group_info_message_bytes) {
        Ok(group_info_message) => group_info_message,
        Err(_) => return ValidationResult::InvalidGroupInfo
    };

    let group_info = match group_info_message.into_group_info() {
        Some(group_info) => group_info,
        None => return ValidationResult::InvalidGroupInfo
    };

    if group_info.group_context().epoch() != expected_epoch {
        return ValidationResult::InvalidGroupInfoEpoch;
    }

    if group_info.group_context().group_id().to_vec() != expected_group_id.to_vec() {
        return ValidationResult::InvalidGroupInfoGroupIdMismatch;
    }

    match group_info.extensions().get_as::<ExternalPubExt>() {
        Ok(extensions) => {
            match extensions {
                Some(_) => {}
                None => return ValidationResult::InvalidGroupInfoMissingPubKeyExtension
                
            }
        }
        Err(_) => return ValidationResult::InvalidGroupInfoMissingPubKeyExtension
    }

    ValidationResult::Valid
}

fn validate_external_group_can_process_group_info_message(mut external_group: ExternalGroup<ExternalConfig>, group_info_message_bytes: Vec<u8>) -> Result<(), ValidationResult> {
    let group_info_message = match MlsMessage::from_bytes(&group_info_message_bytes) {
        Ok(group_info_message) => group_info_message,
        Err(_) => return Err(ValidationResult::InvalidGroupInfo)
    };

    match external_group.process_incoming_message(group_info_message) {
        Ok(ExternalReceivedMessage::GroupInfo(_)) => Ok(()),
        _ => Err(ValidationResult::InvalidGroupInfo.into())
    }
}

pub fn validate_initial_group_info_request(request: InitialGroupInfoRequest) -> InitialGroupInfoResponse {
    let external_client = create_external_client();
    let external_group_snapshot = match ExternalSnapshot::from_bytes(&request.external_group_snapshot) {
        Ok(external_group_snapshot) => external_group_snapshot,
        Err(_) => return InitialGroupInfoResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    let external_group = match external_client.load_group(external_group_snapshot) {
        Ok(group) => group,
        Err(_) => return InitialGroupInfoResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    match validate_group_info_message(request.group_info_message.clone(),
                                      0, 
                                      external_group.group_context().group_id()) {
        ValidationResult::Valid => {},
        result => return InitialGroupInfoResponse {
            result: result.into(),
        }
    }

    if external_group.group_context().epoch() != 0 {
        return InitialGroupInfoResponse {
            result: ValidationResult::InvalidExternalGroupEpoch.into(),
        };
    }

    match external_group.export_tree() {
        Ok(_) => {}
        Err(_) => {
            return InitialGroupInfoResponse {
                result: ValidationResult::InvalidExternalGroupMissingTree.into(),
            };
        }
    }

    let members = external_group.roster().members();
    if members.len() != 1 {
        return InitialGroupInfoResponse {
            result: ValidationResult::InvalidExternalGroupTooManyMembers.into(),
        };
    }
    
    if members[0].signing_identity.signature_key.to_vec() != request.signature_public_key {
        return InitialGroupInfoResponse {
            result: ValidationResult::InvalidPublicSignatureKey.into(),
        };
    }
    
    match validate_external_group_can_process_group_info_message(external_group, request.group_info_message) {
        Ok(_) => {},
        Err(result) => return InitialGroupInfoResponse {
            result: result.into(),
        }
    }

    return InitialGroupInfoResponse {
        result: ValidationResult::Valid.into(),
    };
}

pub fn validate_external_join_request(request: ExternalJoinRequest) -> ExternalJoinResponse {

    let group_state = match request.group_state {
        Some(group_state) => group_state,
        None => return ExternalJoinResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    let external_client = create_external_client();

    let external_group_snapshot = match ExternalSnapshot::from_bytes(&group_state.external_group_snapshot) {
        Ok(external_group_snapshot) => external_group_snapshot,
        Err(_) => return ExternalJoinResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    let mut external_group = match external_client.load_group(external_group_snapshot) {
        Ok(group) => group,
        Err(_) => return ExternalJoinResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    // in the off-chance that an invalid commit slips through, we don't want to stop processing, just keep going.
    for commit_bytes in group_state.commits {
        let _ = match MlsMessage::from_bytes(&commit_bytes) {
            Ok(commit) => external_group.process_incoming_message(commit),
            Err(_) => continue
        };
    }

    match validate_group_info_message(request.proposed_external_join_info_message.clone(), 
        external_group.group_context().epoch() + 1, 
        external_group.group_context().group_id()) {
        ValidationResult::Valid => {},
        result => return ExternalJoinResponse {
            result: result.into(),
        }
    }

    let proposed_external_join_commit = match MlsMessage::from_bytes(&request.proposed_external_join_commit) {
        Ok(commit) => commit,
        Err(_) => return ExternalJoinResponse {
            result: ValidationResult::InvalidCommit.into(),
        }
    };

    if proposed_external_join_commit.epoch() != Some(external_group.group_context().epoch()) {
        return ExternalJoinResponse {
            result: ValidationResult::InvalidExternalGroupEpoch.into(),
        };
    }

    let member_count_before_commit = external_group.roster().members().len();
    match external_group.process_incoming_message(proposed_external_join_commit) {
        Ok(_) => {}
        Err(_) => {
            return ExternalJoinResponse {
                result: ValidationResult::InvalidCommit.into(),
            };
        }
    }

    if member_count_before_commit + 1 != external_group.roster().members().len() {
        return ExternalJoinResponse {
            result: ValidationResult::InvalidCommit.into(),
        };
    }

    match external_group.roster().members().iter().any(|member| 
        member.signing_identity.signature_key.to_vec() == request.signature_public_key 
    ) {
        false => {
            return ExternalJoinResponse {
                result: ValidationResult::InvalidPublicSignatureKey.into(),
            };
        }
        true => {}
    }

    match validate_external_group_can_process_group_info_message(external_group, request.proposed_external_join_info_message) {
        Ok(_) => {},
        Err(result) => return ExternalJoinResponse {
            result: result.into(),
        }
    }

    return ExternalJoinResponse {
        result: ValidationResult::Valid.into(),
    };
}

pub fn validate_key_package_request(request: KeyPackageRequest) -> KeyPackageResponse {
    let group_state = match request.group_state {
        Some(group_state) => group_state,
        None => return KeyPackageResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    let external_client = create_external_client();

    let external_group_snapshot = match ExternalSnapshot::from_bytes(&group_state.external_group_snapshot) {
        Ok(external_group_snapshot) => external_group_snapshot,
        Err(_) => return KeyPackageResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    let mut external_group = match external_client.load_group(external_group_snapshot) {
        Ok(group) => group,
        Err(_) => return KeyPackageResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    // in the off-chance that an invalid commit slips through, we don't want to stop processing, just keep going.
    for commit_bytes in group_state.commits {
        let _ = match MlsMessage::from_bytes(&commit_bytes) {
            Ok(commit) => external_group.process_incoming_message(commit),
            Err(_) => continue
        };
    }

    let proposed_key_package = match request.key_package {
        Some(key_package) => key_package,
        None => return KeyPackageResponse {
            result: ValidationResult::InvalidKeyPackage.into(),
        }
    };

    let proposed_key_package_message = match MlsMessage::from_bytes(&proposed_key_package.key_package) {
        Ok(key_package_message) => key_package_message,
        Err(_) => return KeyPackageResponse {
            result: ValidationResult::InvalidKeyPackage.into(),
        }
    };

    match external_client.validate_key_package(proposed_key_package_message.clone()) {
        Ok(_) => {},
        Err(_) => return KeyPackageResponse {
            result: ValidationResult::InvalidKeyPackage.into(),
        }
    }

    let key_package = match proposed_key_package_message.into_key_package() {
        Some(key_package) => key_package,
        None => return KeyPackageResponse {
            result: ValidationResult::InvalidKeyPackage.into(),
        }
    };

    if key_package.signing_identity().signature_key.to_vec() != proposed_key_package.signature_public_key.to_vec() {
        return KeyPackageResponse {
            result: ValidationResult::InvalidPublicSignatureKey.into(),
        };
    }

    return KeyPackageResponse {
        result: ValidationResult::Valid.into(),
    };
}

pub fn validate_welcome_message_request(request: WelcomeMessageRequest) -> WelcomeMessageResponse {
    let group_state = match request.group_state {
        Some(group_state) => group_state,
        None => return WelcomeMessageResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    let external_client = create_external_client();

    let external_group_snapshot = match ExternalSnapshot::from_bytes(&group_state.external_group_snapshot) {
        Ok(external_group_snapshot) => external_group_snapshot,
        Err(_) => return WelcomeMessageResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    let mut external_group = match external_client.load_group(external_group_snapshot) {
        Ok(group) => group,
        Err(_) => return WelcomeMessageResponse {
            result: ValidationResult::InvalidExternalGroup.into(),
        }
    };

    // in the off-chance that an invalid commit slips through, we don't want to stop processing, just keep going.
    for commit_bytes in group_state.commits {
        let _ = match MlsMessage::from_bytes(&commit_bytes) {
            Ok(commit) => external_group.process_incoming_message(commit),
            Err(_) => continue
        };
    }

    match validate_group_info_message(request.group_info_message.clone(),
        external_group.group_context().epoch() + 1, 
        external_group.group_context().group_id()) {
        ValidationResult::Valid => {},
        result => return WelcomeMessageResponse {
            result: result.into(),
        }
    }

    let proposed_commit = match MlsMessage::from_bytes(&request.welcome_message_commit) {
        Ok(welcome_message) => welcome_message,
        Err(_) => return WelcomeMessageResponse {
            result: ValidationResult::InvalidCommit.into(),
        }
    };

    let external_received_message = match external_group.process_incoming_message(proposed_commit) {
        Ok(message) => message,
        Err(_) => return WelcomeMessageResponse {
            result: ValidationResult::InvalidCommit.into(),
        }
    };

    let commit_message_description = match external_received_message {
        ExternalReceivedMessage::Commit(commit_message_description) => commit_message_description,
        _ => return WelcomeMessageResponse {
            result: ValidationResult::InvalidCommit.into(),
        }
    };

    let applied_proposals = match commit_message_description.effect {
        CommitEffect::NewEpoch(ep) => ep.applied_proposals,
        _ => {
            return WelcomeMessageResponse {
                result: ValidationResult::InvalidCommit.into(),
            };
        }
    };

    let expected_public_signatures: HashSet<Vec<u8>> = HashSet::from_iter(request.signature_public_keys.clone());
    for proposal in applied_proposals.iter() {
        match &proposal.proposal {
            Proposal::Add(proposal) => {
                let public_signature = proposal.signing_identity().signature_key.to_vec();
                if !expected_public_signatures.contains(&public_signature) {
                    return WelcomeMessageResponse {
                        result: ValidationResult::InvalidPublicSignatureKey.into(),
                    };
                }
            }
            _ => {
                return  WelcomeMessageResponse {
                    result: ValidationResult::InvalidProposal.into(),
                };
            }
        }
    }

    if applied_proposals.len() != request.signature_public_keys.len() {
        return WelcomeMessageResponse {
            result: ValidationResult::InvalidPublicSignatureKey.into(),
        };
    }

    for message in request.welcome_messages {
        let message = match MlsMessage::from_bytes(&message) {
            Ok(message) => message,
            Err(_) => return WelcomeMessageResponse {
                result: ValidationResult::InvalidWelcomeMessage.into(),
            }
        };

        let external_received_message = match external_group.process_incoming_message(message) {
            Ok(value) => value,
            Err(_) => return WelcomeMessageResponse {
                result: ValidationResult::InvalidWelcomeMessage.into(),
            }
        };

        match external_received_message {
            ExternalReceivedMessage::Welcome => {},
            _ => return WelcomeMessageResponse {
                result: ValidationResult::InvalidWelcomeMessage.into(),
            }
        }
    }

    match validate_external_group_can_process_group_info_message(external_group, request.group_info_message) {
        Ok(_) => {},
        Err(result) => return WelcomeMessageResponse {
            result: result.into(),
        }
    }

    return WelcomeMessageResponse { 
        result: ValidationResult::Valid.into(), 
    };
}

pub fn snapshot_external_group_request(request: SnapshotExternalGroupRequest) -> SnapshotExternalGroupResponse {
    let external_client = create_external_client();
    let external_group_snapshot = match ExternalSnapshot::from_bytes(&request.external_group_snapshot) {
        Ok(external_group_snapshot) => external_group_snapshot,
        Err(_) => { return SnapshotExternalGroupResponse::default() }
    };

    let mut external_group = match external_client.load_group(external_group_snapshot) {
        Ok(group) => group,
        Err(_) => { return SnapshotExternalGroupResponse::default() }
    };

    // keep track of the last valid group info message, 
    // ie the one that was sent along with the latest valid commit
    let mut last_valid_group_info_message = request.group_info_message;
    for commit_info in request.commits {
        // in the off-chance that an invalid commit has slipped through, we don't want to stop processing, just keep going.
        let commit = match MlsMessage::from_bytes(&commit_info.commit) {
            Ok(commit) => commit,
            Err(_) => continue
        };

        match external_group.process_incoming_message(commit) {
            Ok(_) => {},
            Err(_) => continue
        };

        // if the commit was valid, update the last valid group info message
        match commit_info.group_info_message {
            Some(group_info_message) => {
                last_valid_group_info_message = group_info_message;
            }
            None => {}
        }
    }

    let external_group_snapshot = external_group.snapshot();
    let external_group_snapshot_bytes = match external_group_snapshot.to_bytes() {
        Ok(bytes) => bytes,
        Err(_) => { return SnapshotExternalGroupResponse::default() }
    };

    let response = SnapshotExternalGroupResponse {
        external_group_snapshot: external_group_snapshot_bytes,
        group_info_message: last_valid_group_info_message,
    };
    return response;
}

#[cfg(test)]
mod tests {

    use super::*;
    
    use mls_rs::group::ExportedTree;

    use mls_rs::{
        crypto::SignatureSecretKey,
        client_builder::{BaseConfig, WithCryptoProvider, WithIdentityProvider},
        identity::{
            basic::BasicCredential,
            SigningIdentity,
        },
        CipherSuite, CipherSuiteProvider, CryptoProvider, Client
    };
    const CIPHERSUITE: CipherSuite = CipherSuite::P256_AES128;
    use mls_rs::mls_rules::{CommitOptions, DefaultMlsRules};
    use river_mls_protocol::{KeyPackage, MlsGroupState};
    type ClientConfig = WithIdentityProvider<BasicIdentityProvider, WithCryptoProvider<RustCryptoProvider, BaseConfig>>;
    type ProviderCipherSuite = <RustCryptoProvider as CryptoProvider>::CipherSuiteProvider;
    
    fn cipher_suite_provider(
        crypto_provider: &RustCryptoProvider,
    ) -> ProviderCipherSuite {
        crypto_provider
            .cipher_suite_provider(CIPHERSUITE)
            .unwrap()
    }

    fn make_identity(
        crypto_provider: &RustCryptoProvider,
        name: &[u8],
    ) -> (SignatureSecretKey, SigningIdentity) {
        let cipher_suite = cipher_suite_provider(crypto_provider);
        let (secret, public) = cipher_suite.signature_key_generate().unwrap();

        let basic_identity = BasicCredential::new(name.to_vec());
        let signing_identity = SigningIdentity::new(basic_identity.into_credential(), public);
        (secret, signing_identity)
    }

    fn create_client(name: String) -> Client<ClientConfig> {
        let crypto_provider = RustCryptoProvider::default();
        let (secret, signing_identity) = make_identity(&crypto_provider, name.as_bytes());
        let commit_options = CommitOptions::default().with_ratchet_tree_extension(true).with_allow_external_commit(true);
        let mls_rules = DefaultMlsRules::default().with_commit_options(commit_options);

        let client = Client::builder()
            .identity_provider(BasicIdentityProvider)
            .crypto_provider(crypto_provider)
            .signing_identity(signing_identity, secret, CIPHERSUITE).mls_rules(mls_rules)
            .build();
        client
    }

    fn perform_external_join(external_group_snapshot: ExternalSnapshot, commits: Vec<MlsMessage>, group_info_message: MlsMessage, client: Client<ClientConfig>) -> (MlsMessage, MlsMessage) {
        let external_client = create_external_client();
        let mut external_group = external_client.load_group(external_group_snapshot.clone()).unwrap();
        for commit in commits.iter() {
            external_group.process_incoming_message(commit.clone()).unwrap();
        }
        let tree_after_commits_bytes = external_group.export_tree().unwrap();
        let exported_tree_after_commits = ExportedTree::from_bytes(&tree_after_commits_bytes).unwrap();

        let client_builder = client.external_commit_builder().unwrap().with_tree_data(exported_tree_after_commits.clone());
        let (client_group, client_commit) = client_builder
            .build(group_info_message.clone())
            .unwrap();
        
        let group_info_message = client_group.group_info_message_allowing_ext_commit(false).unwrap();
        return (group_info_message, client_commit);
    }

    #[test]
    fn test_validate_initial_group_info_request_valid() {
        let bob_client = create_client("bob".to_string());
        let bob_group = bob_client.create_group(Default::default(), Default::default()).unwrap();
        let bob_group_info_message = bob_group.group_info_message_allowing_ext_commit(false).unwrap();

        let external_client = create_external_client();
        let tree_bytes = bob_group.export_tree().to_bytes().unwrap();
        let tree = ExportedTree::from_bytes(&tree_bytes).unwrap();
        let external_group = external_client.observe_group(bob_group_info_message.clone(), Some(tree)).unwrap();
        let external_group_snapshot = external_group.snapshot();

        let request = InitialGroupInfoRequest {
            signature_public_key: bob_client.signing_identity().unwrap().0.signature_key.to_vec(),
            group_info_message: bob_group_info_message.to_bytes().unwrap(),
            external_group_snapshot: external_group_snapshot.to_bytes().unwrap(),
        };

        let response = validate_initial_group_info_request(request);
        assert_eq!(response.result, ValidationResult::Valid.into());
    }

    #[test]
    fn test_validate_initial_group_info_request_invalid_public_signature_key() {
        let bob_client = create_client("bob".to_string());
        let bob_group = bob_client.create_group(Default::default(), Default::default()).unwrap();
        let bob_group_info_message = bob_group.group_info_message_allowing_ext_commit(false).unwrap();

        let external_client = create_external_client();
        let tree_bytes = bob_group.export_tree().to_bytes().unwrap();
        let tree = ExportedTree::from_bytes(&tree_bytes).unwrap();
        let external_group = external_client.observe_group(bob_group_info_message.clone(), Some(tree)).unwrap();
        let external_group_snapshot = external_group.snapshot();

        let request = InitialGroupInfoRequest {
            signature_public_key: vec![0; 1],
            group_info_message: bob_group_info_message.to_bytes().unwrap(),
            external_group_snapshot: external_group_snapshot.to_bytes().unwrap(),
        };

        let response = validate_initial_group_info_request(request);
        assert_eq!(response.result, ValidationResult::InvalidPublicSignatureKey.into());
    }

    #[test]
    fn test_validate_initial_group_info_request_invalid_group_info() {
        let bob_client = create_client("bob".to_string());
        let bob_group = bob_client.create_group(Default::default(), Default::default()).unwrap();
        let bob_group_info_message = bob_group.group_info_message(false).unwrap();

        let external_client = create_external_client();
        let tree_bytes = bob_group.export_tree().to_bytes().unwrap();
        let tree = ExportedTree::from_bytes(&tree_bytes).unwrap();
        let external_group = external_client.observe_group(bob_group_info_message.clone(), Some(tree)).unwrap();
        let external_group_snapshot = external_group.snapshot();

        let request = InitialGroupInfoRequest {
            signature_public_key: bob_client.signing_identity().unwrap().0.signature_key.to_vec(),
            group_info_message: bob_group_info_message.to_bytes().unwrap(),
            external_group_snapshot: external_group_snapshot.to_bytes().unwrap(),
        };
        
        let response = validate_initial_group_info_request(request);
        assert_eq!(response.result, ValidationResult::InvalidGroupInfoMissingPubKeyExtension.into());
    }

    #[test]
    fn test_validate_external_join() {
        let bob_client = create_client("bob".to_string());
        let bob_group = bob_client.create_group(Default::default(), Default::default()).unwrap();
        let bob_group_info_message = bob_group.group_info_message_allowing_ext_commit(false).unwrap();

        let external_client = create_external_client();
        let tree_bytes = bob_group.export_tree().to_bytes().unwrap();
        let tree = ExportedTree::from_bytes(&tree_bytes).unwrap();

        let external_group = external_client.observe_group(bob_group_info_message.clone(), Some(tree)).unwrap();
        let external_group_snapshot = external_group.snapshot();
        let mut latest_group_info_message_without_tree = bob_group_info_message.clone();
        let mut commits: Vec<MlsMessage> = Vec::new();

        // apply 10 external joins
        for i in 0..10 {
            let name = format!("client {}", i);
            let client = create_client(name);
            let (client_group_info_message, commit) = perform_external_join(external_group_snapshot.clone(), commits.clone(), latest_group_info_message_without_tree, client);
            commits.push(commit);
            latest_group_info_message_without_tree = client_group_info_message;
        }

        let alice = create_client("alice".to_string());
        let signature_public_key = alice.signing_identity().unwrap().0.signature_key.to_vec();
        let (alice_group_info_message, alice_commit) = perform_external_join(external_group_snapshot.clone(), commits.clone(), latest_group_info_message_without_tree, alice);
        let request = ExternalJoinRequest {
            group_state: Some(MlsGroupState {
                external_group_snapshot: external_group_snapshot.to_bytes().unwrap(),
                commits: commits.iter().map(|commit| commit.to_bytes().unwrap()).collect(),
            }),
            signature_public_key: signature_public_key,
            proposed_external_join_info_message: alice_group_info_message.to_bytes().unwrap(),
            proposed_external_join_commit: alice_commit.to_bytes().unwrap(),
        };
        let result = validate_external_join_request(request);
        assert_eq!(result.result, ValidationResult::Valid.into());
    }

    #[test]
    fn test_validate_key_package() {
        let bob_client = create_client("bob".to_string());
        let bob_group = bob_client.create_group(Default::default(), Default::default()).unwrap();
        let bob_group_info_message = bob_group.group_info_message_allowing_ext_commit(false).unwrap();

        let external_client = create_external_client();
        let tree_bytes = bob_group.export_tree().to_bytes().unwrap();
        let tree = ExportedTree::from_bytes(&tree_bytes).unwrap();

        let external_group = external_client.observe_group(bob_group_info_message.clone(), Some(tree)).unwrap();
        let external_group_snapshot = external_group.snapshot();
        let mut latest_group_info_message_without_tree = bob_group_info_message.clone();
        let mut commits: Vec<MlsMessage> = Vec::new();

        // apply some external joins
        for i in 0..10 {
            let name = format!("client {}", i);
            let client = create_client(name);
            let (client_group_info_message, commit) = perform_external_join(external_group_snapshot.clone(), commits.clone(), latest_group_info_message_without_tree, client);
            commits.push(commit);
            latest_group_info_message_without_tree = client_group_info_message;
        }

        let alice = create_client("alice".to_string());
        let key_package = alice.generate_key_package_message(Default::default(), Default::default()).unwrap();

        let request = KeyPackageRequest {
            group_state: Some(MlsGroupState {
                external_group_snapshot: external_group_snapshot.to_bytes().unwrap(),
                commits: commits.iter().map(|commit| commit.to_bytes().unwrap()).collect(),
            }),
            key_package: Some(KeyPackage {
                key_package: key_package.to_bytes().unwrap(),
                signature_public_key: alice.signing_identity().unwrap().0.signature_key.to_vec(),
            }),
        };

        let result = validate_key_package_request(request);
        assert_eq!(result.result, ValidationResult::Valid.into());
    }

}
