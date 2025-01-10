use prost::Message;
use river_mls_protocol::{mls_request, MlsRequest};

#[no_mangle]
pub extern "C" fn process_mls_request(input_ptr: *const u8, input_len: usize, output_ptr: *mut *mut u8, output_len: *mut usize) -> i32 {

    if input_ptr.is_null() || output_ptr.is_null() || output_len.is_null() {
        return -1;
    }

    let input = unsafe { std::slice::from_raw_parts(input_ptr, input_len) };    
    let request: MlsRequest = match river_mls_protocol::MlsRequest::decode(input) {
        Ok(request) => request,
        Err(e) => {
            println!("error parsing protobuf:{}", e);
            return -2
        }
    };
    
    let payload = match request.content {
        Some(content) => content,
        None => {
            println!("no content in request");
            return -3
        }
    };
    
    let result = match payload {
        mls_request::Content::InitialGroupInfo(initial_group_info) => {
            river_mls::validate_initial_group_info_request(initial_group_info).encode_to_vec()
        }
        mls_request::Content::ExternalJoin(external_join) => {
            river_mls::validate_external_join_request(external_join).encode_to_vec()
        }
        mls_request::Content::SnapshotExternalGroup(snapshot_external_group) => {
            river_mls::snapshot_external_group_request(snapshot_external_group).encode_to_vec()
        }
        mls_request::Content::KeyPackage(key_package) => {
            river_mls::validate_key_package_request(key_package).encode_to_vec()
        }
        mls_request::Content::WelcomeMessage(welcome_message) => {
            river_mls::validate_welcome_message_request(welcome_message).encode_to_vec()
        }
    };
    
    // Allocate memory for the output
    let output_data = result.into_boxed_slice();
    let length = output_data.len();
    let output_data_ptr = Box::into_raw(output_data);

    // Write the pointer and length back to the caller
    unsafe {
        *output_ptr = output_data_ptr as *mut u8;
        *output_len = length;
    }

    0
}

#[no_mangle]
pub extern "C" fn free_bytes(ptr: *mut u8, len: usize) {
    if ptr.is_null() {
        return;
    }
    unsafe {
        let _ = Box::from_raw(std::slice::from_raw_parts_mut(ptr, len));
    }
}