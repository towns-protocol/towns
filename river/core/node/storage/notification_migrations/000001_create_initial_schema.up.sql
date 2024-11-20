CREATE TABLE IF NOT EXISTS userpreferences (
    user_id CHAR(64) PRIMARY KEY NOT NULL,
    dm      SMALLINT             NOT NULL,
    gdm     SMALLINT             NOT NULL
);

CREATE TABLE IF NOT EXISTS spaces (
    user_id  CHAR(40) NOT NULL,
    space_id CHAR(64) NOT NULL,
    setting  SMALLINT NOT NULL,
    PRIMARY KEY (user_id, space_id)
);

CREATE TABLE IF NOT EXISTS channels (
    user_id    CHAR(40) NOT NULL,
    channel_id CHAR(64) NOT NULL,
    setting    SMALLINT NOT NULL,
    PRIMARY KEY (user_id, channel_id)
);

CREATE TABLE IF NOT EXISTS webpushsubscriptions (
    key_auth   VARCHAR   NOT NULL,
    key_p256dh VARCHAR   NOT NULL,
    endpoint   VARCHAR   NOT NULL,
    user_id    CHAR(40)  NOT NULL,
    last_seen  TIMESTAMP NOT NULL,
    PRIMARY KEY (key_auth, key_p256dh)
);

CREATE INDEX WEB_SUB_USER_ID_IDX ON webpushsubscriptions USING hash (user_id);

CREATE TABLE IF NOT EXISTS apnpushsubscriptions (
    device_token bytea PRIMARY KEY NOT NULL,
    environment  SMALLINT          NOT NULL,
    user_id      CHAR(40)          NOT NULL,
    last_seen    TIMESTAMP         NOT NULL
);

CREATE INDEX APN_SUB_USER_ID_IDX ON apnpushsubscriptions USING hash (user_id);
