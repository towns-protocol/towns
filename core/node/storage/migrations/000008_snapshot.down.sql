DO $$
    DECLARE

        suffix CHAR(2);
        i INT;
        numPartitions INT;

    BEGIN

        SELECT num_partitions FROM settings WHERE single_row_key IS TRUE INTO numPartitions;

        FOR i IN 0.. numPartitions LOOP
                suffix = LPAD(TO_HEX(i), 2, '0');

                -- Media streams
                EXECUTE 'ALTER TABLE miniblocks_m' || suffix || ' DROP COLUMN;';
                EXECUTE 'ALTER TABLE miniblock_candidates_m' || suffix || ' DROP COLUMN snapshot BYTEA;';

                -- Regular streams
                EXECUTE 'ALTER TABLE miniblocks_r' || suffix || ' DROP COLUMN snapshot BYTEA;';
                EXECUTE 'ALTER TABLE miniblock_candidates_r' || suffix || ' DROP COLUMN snapshot BYTEA;';
            END LOOP;
    END;
$$;