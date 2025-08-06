WITH towns_created AS (SELECT town_address
                       FROM dune.towns_protocol.result_towns_created),

-- Single pass through base.logs for all membership-related events
     all_membership_logs AS (SELECT l.contract_address AS town_address,
                                    l.tx_hash,
                                    l.block_time,
                                    l.block_number,
                                    l.index            AS log_index,
                                    l.topic0,
                                    l.topic1,
                                    l.topic2,
                                    CASE
                                        WHEN l.topic0 =
                                             0x2f40b0474996b72a4251e00fb9170cdd960deea1dc749772cbbab61395b9b576
                                            THEN 'mint'
                                        WHEN l.topic0 =
                                             0x2ec2be2c4b90c2cf13ecb6751a24daed6bb741ae5ed3f7371aabf9402f6d62e8
                                            THEN 'subscription_update'
                                        END            AS log_type
                             FROM base.logs l
                                      JOIN towns_created tc ON l.contract_address = tc.town_address
                             WHERE l.topic0 IN (
                                                0x2f40b0474996b72a4251e00fb9170cdd960deea1dc749772cbbab61395b9b576, -- MembershipTokenIssued
                                                0x2ec2be2c4b90c2cf13ecb6751a24daed6bb741ae5ed3f7371aabf9402f6d62e8 -- SubscriptionUpdate
                                 )
                               AND l.block_time > CAST('2024-05-01' AS timestamp)),

-- Parse mint events
     membership_mints AS (SELECT town_address,
                                 tx_hash,
                                 block_time,
                                 block_number,
                                 log_index,
                                 substring(topic1 FROM 13)    AS member_address,
                                 bytearray_to_uint256(topic2) AS token_id,
                                 'mint'                       AS event_type
                          FROM all_membership_logs
                          WHERE log_type = 'mint'),

-- Parse subscription update events  
     subscription_updates AS (SELECT town_address,
                                     tx_hash,
                                     block_time,
                                     block_number,
                                     log_index,
                                     bytearray_to_uint256(topic1) AS token_id,
                                     bytearray_to_uint256(topic2) AS expiration
                              FROM all_membership_logs
                              WHERE log_type = 'subscription_update'),

-- Mint events with expiration (join mints with their subscription updates)
     mint_events AS (SELECT mm.block_time,
                            mm.block_number,
                            mm.event_type,
                            mm.town_address,
                            mm.token_id,
                            mm.member_address,
                            su.expiration,
                            mm.tx_hash,
                            mm.log_index
                     FROM membership_mints mm
                              JOIN subscription_updates su
                                   ON mm.tx_hash = su.tx_hash
                                       AND mm.token_id = su.token_id
                                       AND mm.town_address = su.town_address),

-- Renewal events (SubscriptionUpdate events that don't have MembershipTokenIssued in same tx)
     renewal_events AS (SELECT su.block_time,
                               su.block_number,
                               'renewal' AS event_type,
                               su.town_address,
                               su.token_id,
                               NULL      AS member_address, -- Cannot determine from renewal events alone
                               su.expiration,
                               su.tx_hash,
                               su.log_index
                        FROM subscription_updates su
                                 LEFT JOIN membership_mints mm
                                           ON su.tx_hash = mm.tx_hash
                                               AND su.token_id = mm.token_id
                                               AND su.town_address = mm.town_address
                        WHERE mm.tx_hash IS NULL -- Exclude mints
     ),

-- Union all subscription events
     all_subscription_events AS (SELECT *
                                 FROM mint_events
                                 UNION ALL
                                 SELECT *
                                 FROM renewal_events)

SELECT block_time,
       block_number,
       event_type,
       town_address,
       token_id,
       member_address,
       expiration,
       tx_hash,
       log_index
FROM all_subscription_events
ORDER BY block_time DESC, log_index;
