-- Approved Operators - Operators with Approved or Active status
-- Contract: 0x7c0422b31401C936172C897802CF0373B35B7698 (BaseRegistry)
-- Event: OperatorStatusChanged(address,uint8) 0x7db2ae93d80cbf3cf719888318a0b92adff1855bcb01eda517607ed7b0f2183a
-- NodeOperatorStatus: 0=Exiting, 1=Standby, 2=Approved, 3=Active

WITH latest_operator_status AS (SELECT substring(l.topic1 FROM 13)    AS operator_address,
                                       bytearray_to_uint256(l.topic2) AS status_code,
                                       l.block_time                   AS status_change_time,
                                       CASE
                                           WHEN bytearray_to_uint256(l.topic2) = 2 THEN 'Approved'
                                           WHEN bytearray_to_uint256(l.topic2) = 3 THEN 'Active'
                                           END                        AS status,
                                       ROW_NUMBER()                      OVER (PARTITION BY substring(l.topic1 FROM 13) ORDER BY l.block_time DESC, l.index DESC) AS rn
                                FROM base.logs l
                                WHERE l.contract_address = 0x7c0422b31401C936172C897802CF0373B35B7698
                                  AND l.topic0 = 0x7db2ae93d80cbf3cf719888318a0b92adff1855bcb01eda517607ed7b0f2183a
                                  AND bytearray_to_uint256(l.topic2) IN (2, 3) -- Only Approved or Active
                                  AND l.block_time > CAST('2024-05-01' AS timestamp))

SELECT status_change_time,
       operator_address,
       status
FROM latest_operator_status
WHERE rn = 1 -- Latest status only
ORDER BY status_change_time DESC;
