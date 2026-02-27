CREATE SCHEMA IF NOT EXISTS swpc;


DROP TABLE IF EXISTS swpc.goes_proton_flux;


CREATE TABLE swpc.goes_proton_flux (
    energy     TEXT        NOT NULL,
    flux       DOUBLE PRECISION,
    satellite  INTEGER     NOT NULL,
    time_tag   TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (time_tag, satellite, energy)
);




DROP TABLE IF EXISTS swpc.goes_xray_flux;

CREATE TABLE swpc.goes_xray_flux (
    electron_contaminaton  BOOLEAN,
	electron_correction    DOUBLE PRECISION,
	energy                 TEXT        NOT NULL,
	flux                   DOUBLE PRECISION,
	observed_flux          DOUBLE PRECISION,
	satellite              INTEGER     NOT NULL,
    time_tag               TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (time_tag, satellite, energy)
);



DROP TABLE IF EXISTS swpc.solar_wind_plasma;

CREATE TABLE swpc.solar_wind_plasma (
    time_tag     TIMESTAMPTZ NOT NULL PRIMARY KEY,
    density      DOUBLE PRECISION,
    speed        DOUBLE PRECISION,
    temperature  DOUBLE PRECISION
);




DROP TABLE IF EXISTS swpc.imf_magnetic_field;

CREATE TABLE swpc.imf_magnetic_field (
    time_tag  TIMESTAMPTZ NOT NULL PRIMARY KEY,
    bx_gsm    DOUBLE PRECISION,
    by_gsm    DOUBLE PRECISION,
    bz_gsm    DOUBLE PRECISION,
    lon_gsm   DOUBLE PRECISION,
    lat_gsm   DOUBLE PRECISION,
    bt        DOUBLE PRECISION
);



DROP TABLE IF EXISTS swpc.kp_index;

CREATE TABLE swpc.kp_index (
    time_tag        TIMESTAMPTZ NOT NULL PRIMARY KEY,
    kp              DOUBLE PRECISION,
    a_running       INTEGER,
    station_count   INTEGER
);




DROP TABLE IF EXISTS swpc.swpc_alerts;

CREATE TABLE swpc.swpc_alerts (
    issue_datetime  TIMESTAMPTZ NOT NULL,
	message         TEXT,
    product_id      TEXT,
    
    PRIMARY KEY (issue_datetime, product_id)
);


select * from swpc.goes_proton_flux limit 10;
select * from swpc.goes_xray_flux limit 10;
select * from swpc.imf_magnetic_field limit 10;
select * from swpc.solar_wind_plasma limit 10;
select * from swpc.kp_index limit 10;
select * from swpc.swpc_alerts limit 10;





