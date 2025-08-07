-- Airdrop Withdrawal Analysis - Track withdrawals after claiming and staking
-- Connects DropFacet_Claimed_And_Staked events with subsequent Stake and InitiateWithdraw events
-- Shows user retention behavior after claiming airdrop tokens

WITH claimed_and_staked AS (SELECT block_time,
                                   block_number,
                                   tx_hash,
                                   log_index,
                                   account,
                                   amount,
                                   condition_id
                            FROM dune.towns_protocol.result_airdrop_claims
                            WHERE claim_type = 'staked'),

-- Match Stake events in same transaction as claim
     stake_matches AS (SELECT c.block_time   AS claim_time,
                              c.block_number AS claim_block,
                              c.tx_hash,
                              c.account      AS claimer,
                              c.amount       AS claimed_amount,
                              c.condition_id,
                              s.deposit_id,
                              s.delegatee,
                              s.beneficiary,
                              s.amount       AS staked_amount
                       FROM claimed_and_staked c
                                INNER JOIN dune.towns_protocol.result_staking_events s
                                           ON c.tx_hash = s.tx_hash
                                               AND c.account = s.owner
                                               AND s.event_type = 'stake'),

-- Find subsequent withdrawals by deposit_id
     withdrawals AS (SELECT sm.claim_time,
                            sm.claim_block,
                            sm.tx_hash                                    AS claim_tx_hash,
                            sm.claimer,
                            sm.claimed_amount,
                            sm.condition_id,
                            sm.deposit_id,
                            sm.delegatee,
                            sm.beneficiary,
                            sm.staked_amount,
                            w.block_time                                  AS withdrawal_initiation_time,
                            w.block_number                                AS withdrawal_block,
                            w.tx_hash                                     AS withdrawal_tx_hash,
                            w.amount                                      AS withdrawal_amount,
                            DATE_DIFF('day', sm.claim_time, w.block_time) AS days_to_withdrawal
                     FROM stake_matches sm
                              LEFT JOIN dune.towns_protocol.result_staking_events w
                                        ON sm.deposit_id = w.deposit_id
                                            AND w.event_type = 'initiate_withdraw'
                                            AND w.block_time >= sm.claim_time),

-- Summary statistics
     withdrawal_summary AS (SELECT COUNT(*)                                 AS total_stakers,
                                   SUM(claimed_amount) / 1e18               AS total_claimed_staked_amount,
                                   COUNT(withdrawal_initiation_time)        AS withdrawal_count,
                                   SUM(CASE WHEN withdrawal_initiation_time IS NOT NULL THEN claimed_amount END) /
                                   1e18                                     AS total_withdrawn_amount,
                                   AVG(CASE
                                           WHEN withdrawal_initiation_time IS NOT NULL
                                               THEN days_to_withdrawal END) AS avg_days_to_withdrawal
                            FROM withdrawals)

SELECT *
FROM withdrawal_summary;
