-- Stakes by Operator - Current voting power delegated to approved operators
-- Shows which operators have the most TOWNS tokens delegated to them
-- Only includes Approved or Active operators

WITH latest_voting_power AS (SELECT delegate,
                                    new_votes / 1e18 AS current_voting_power
                             FROM (SELECT delegate,
                                          new_votes,
                                          ROW_NUMBER() OVER (PARTITION BY delegate ORDER BY block_number DESC, log_index DESC) AS rn
                                   FROM dune.towns_protocol.result_delegate_votes_events) ranked
                             WHERE rn = 1
                               AND new_votes > 0),

     operator_stakes AS (SELECT ao.operator_address,
                                ao.status,
                                ao.status_change_time,
                                lvp.current_voting_power
                         FROM dune.towns_protocol.result_approved_operators ao
                                  INNER JOIN latest_voting_power lvp
                                             ON ao.operator_address = lvp.delegate)

SELECT operator_address,
       status,
       status_change_time,
       ROUND(current_voting_power, 2) AS total_voting_power_towns,
       RANK()                            OVER (ORDER BY current_voting_power DESC) AS rank_by_voting_power
FROM operator_stakes
ORDER BY current_voting_power DESC;
