-- Staking Events - All staking-related events from rewards distribution contract
-- Contract: 0x7c0422b31401C936172C897802CF0373B35B7698
-- Events from IRewardsDistribution.sol:
-- Stake(address,address,address,uint256,uint96) 0xfc8744d74019c166abf1c554364af2a3d067ea57fa6f635f4552411ea44d29c7
-- IncreaseStake(uint256,uint96) 0x82eeeecf3fcd1639730b92bca89ac4aa5a7c4a252fb716d0817957e83ca6ccb3
-- Redelegate(uint256,address) 0xa6494190270aff4668179671a838f4079a7b83070d0dc4aafc1252956fa93d13
-- ChangeBeneficiary(uint256,address) 0x465099fe7523b081d53bc8776cdf5ae8d5629f83535fb55f947e85000b1fd571
-- InitiateWithdraw(address,uint256,uint96) 0x83a8fb903cd44ada83e49af5f21f61369a370e61ae03b95f73a462cc4d38d14e
-- Withdraw(uint256,uint96) 0x379f5516239c4d5aa59274f4ec7af0b3fe40f0c9abbb4d4ca20bd49f4caa0fcd
-- ClaimReward(address,address,uint256) 0x7e77f685b38c861064cb08f2776eb5dfd3c82f652ed9f21221b8c53b75628e51

SELECT l.block_time,
       l.block_number,
       CASE
           WHEN l.topic0 = 0xfc8744d74019c166abf1c554364af2a3d067ea57fa6f635f4552411ea44d29c7
               THEN 'stake'
           WHEN l.topic0 = 0x82eeeecf3fcd1639730b92bca89ac4aa5a7c4a252fb716d0817957e83ca6ccb3
               THEN 'increase_stake'
           WHEN l.topic0 = 0xa6494190270aff4668179671a838f4079a7b83070d0dc4aafc1252956fa93d13
               THEN 'redelegate'
           WHEN l.topic0 = 0x465099fe7523b081d53bc8776cdf5ae8d5629f83535fb55f947e85000b1fd571
               THEN 'change_beneficiary'
           WHEN l.topic0 = 0x83a8fb903cd44ada83e49af5f21f61369a370e61ae03b95f73a462cc4d38d14e
               THEN 'initiate_withdraw'
           WHEN l.topic0 = 0x379f5516239c4d5aa59274f4ec7af0b3fe40f0c9abbb4d4ca20bd49f4caa0fcd
               THEN 'withdraw'
           WHEN l.topic0 = 0x7e77f685b38c861064cb08f2776eb5dfd3c82f652ed9f21221b8c53b75628e51
               THEN 'claim_reward'
           END AS event_type,
       -- Deposit ID (data[0:32] for Stake, topic1 for most, topic2 for InitiateWithdraw)
       CASE
           WHEN l.topic0 = 0xfc8744d74019c166abf1c554364af2a3d067ea57fa6f635f4552411ea44d29c7
               THEN bytearray_to_uint256(substring(l.data FROM 1 FOR 32))
           WHEN l.topic0 = 0x83a8fb903cd44ada83e49af5f21f61369a370e61ae03b95f73a462cc4d38d14e
               THEN bytearray_to_uint256(l.topic2)
           WHEN l.topic0 IN (
                             0x82eeeecf3fcd1639730b92bca89ac4aa5a7c4a252fb716d0817957e83ca6ccb3,
                             0xa6494190270aff4668179671a838f4079a7b83070d0dc4aafc1252956fa93d13,
                             0x465099fe7523b081d53bc8776cdf5ae8d5629f83535fb55f947e85000b1fd571,
                             0x379f5516239c4d5aa59274f4ec7af0b3fe40f0c9abbb4d4ca20bd49f4caa0fcd
               )
               THEN bytearray_to_uint256(l.topic1)
           END AS deposit_id,
       -- Owner (topic1 for Stake, InitiateWithdraw only)
       CASE
           WHEN l.topic0 IN (
                             0xfc8744d74019c166abf1c554364af2a3d067ea57fa6f635f4552411ea44d29c7,
                             0x83a8fb903cd44ada83e49af5f21f61369a370e61ae03b95f73a462cc4d38d14e
               )
               THEN substring(l.topic1 FROM 13)
           END AS owner,
       -- Delegatee (topic2 for Stake, Redelegate)
       CASE
           WHEN l.topic0 IN (
                             0xfc8744d74019c166abf1c554364af2a3d067ea57fa6f635f4552411ea44d29c7,
                             0xa6494190270aff4668179671a838f4079a7b83070d0dc4aafc1252956fa93d13
               )
               THEN substring(l.topic2 FROM 13)
           END AS delegatee,
       -- Beneficiary (topic3 for Stake, topic2 for ChangeBeneficiary, topic1 for ClaimReward)
       CASE
           WHEN l.topic0 = 0xfc8744d74019c166abf1c554364af2a3d067ea57fa6f635f4552411ea44d29c7
               THEN substring(l.topic3 FROM 13)
           WHEN l.topic0 = 0x465099fe7523b081d53bc8776cdf5ae8d5629f83535fb55f947e85000b1fd571
               THEN substring(l.topic2 FROM 13)
           WHEN l.topic0 = 0x7e77f685b38c861064cb08f2776eb5dfd3c82f652ed9f21221b8c53b75628e51
               THEN substring(l.topic1 FROM 13)
           END AS beneficiary,
       -- Amount (data field, position varies by event)
       CASE
           WHEN l.topic0 = 0xfc8744d74019c166abf1c554364af2a3d067ea57fa6f635f4552411ea44d29c7
               THEN bytearray_to_uint256(substring(l.data FROM 33 FOR 32)) / 1e18
           WHEN l.topic0 IN (
                             0x82eeeecf3fcd1639730b92bca89ac4aa5a7c4a252fb716d0817957e83ca6ccb3,
                             0x83a8fb903cd44ada83e49af5f21f61369a370e61ae03b95f73a462cc4d38d14e,
                             0x379f5516239c4d5aa59274f4ec7af0b3fe40f0c9abbb4d4ca20bd49f4caa0fcd,
                             0x7e77f685b38c861064cb08f2776eb5dfd3c82f652ed9f21221b8c53b75628e51
               )
               THEN bytearray_to_uint256(substring(l.data FROM 1 FOR 32)) / 1e18
           END AS amount,
       -- Recipient (topic2 for ClaimReward only)
       CASE
           WHEN l.topic0 = 0x7e77f685b38c861064cb08f2776eb5dfd3c82f652ed9f21221b8c53b75628e51
               THEN substring(l.topic2 FROM 13)
           END AS recipient,
       l.tx_hash,
       l.index AS log_index
FROM base.logs l
WHERE l.contract_address = 0x7c0422b31401C936172C897802CF0373B35B7698
  AND l.topic0 IN (
                   0xfc8744d74019c166abf1c554364af2a3d067ea57fa6f635f4552411ea44d29c7,
                   0x82eeeecf3fcd1639730b92bca89ac4aa5a7c4a252fb716d0817957e83ca6ccb3,
                   0xa6494190270aff4668179671a838f4079a7b83070d0dc4aafc1252956fa93d13,
                   0x465099fe7523b081d53bc8776cdf5ae8d5629f83535fb55f947e85000b1fd571,
                   0x83a8fb903cd44ada83e49af5f21f61369a370e61ae03b95f73a462cc4d38d14e,
                   0x379f5516239c4d5aa59274f4ec7af0b3fe40f0c9abbb4d4ca20bd49f4caa0fcd,
                   0x7e77f685b38c861064cb08f2776eb5dfd3c82f652ed9f21221b8c53b75628e51
    )
  AND l.block_time > CAST('2024-12-17' AS timestamp)
ORDER BY block_time DESC, log_index DESC;
