CREATE TABLE patches (
   src_model        CHAR(64),
   src_id           CHAR(64),
   src_name         CHAR(64),
   src_category     CHAR(64),
   midi_msb         INT NOT NULL default 0,
   midi_lsb         INT NOT NULL default 0,
   midi_pgm         INT NOT NULL default 0,
   midi_channel     INT NOT NULL default 0
);