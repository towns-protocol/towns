-- Stakes by Town - Current voting power delegated to town addresses
-- Shows which towns have the most TOWNS tokens delegated to them

WITH latest_voting_power AS (SELECT delegate,
                                    new_votes / 1e18 AS current_voting_power
                             FROM (SELECT delegate,
                                          new_votes,
                                          ROW_NUMBER() OVER (PARTITION BY delegate ORDER BY block_number DESC, log_index DESC) AS rn
                                   FROM dune.towns_protocol.result_delegate_votes_events) ranked
                             WHERE rn = 1
                               AND new_votes > 0),

     town_stakes AS (SELECT tc.town_address,
                            tc.town_owner,
                            tc.block_time AS town_created_time,
                            lvp.current_voting_power
                     FROM dune.towns_protocol.result_towns_created tc
                              INNER JOIN latest_voting_power lvp
                                         ON tc.town_address = lvp.delegate)

SELECT town_address,
       town_owner,
       town_created_time,
       ROUND(current_voting_power, 2) AS total_voting_power_towns,
       RANK()                            OVER (ORDER BY current_voting_power DESC) AS rank_by_voting_power
FROM town_stakes
ORDER BY current_voting_power DESC;
