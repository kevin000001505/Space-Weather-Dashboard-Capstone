"""Tests for transmission lines ingestion task and Pydantic model."""

import csv
import os
import tempfile
from datetime import date

import pytest
from pydantic import ValidationError

from tasks.models import TransmissionLineRecord
from tasks.transmission_lines import ingest_transmission_lines_csv
from tasks.db import initial_transmission_lines_db


# ---------------------------------------------------------------------------
# Sample data
# ---------------------------------------------------------------------------

SAMPLE_ROW = {
    "OBJECTID": "17",
    "line_id": "140825",
    "TYPE": "AC; OVERHEAD",
    "STATUS": "IN SERVICE",
    "NAICS_CODE": "221121",
    "NAICS_DESC": "ELECTRIC BULK POWER TRANSMISSION AND CONTROL",
    "SOURCE": "IMAGERY, EIA 861, EIA 860",
    "SOURCEDATE": "2017-06-01",
    "VAL_METHOD": "IMAGERY",
    "VAL_DATE": "2018-05-03",
    "OWNER": "NOT AVAILABLE",
    "VOLTAGE": "345.0",
    "VOLT_CLASS": "345",
    "INFERRED": "Y",
    "SUB_1": "ST FRANCIS ENERGY FACILITY",
    "SUB_2": "TAP154742",
    "SHAPE__Len": "9189.71676492387",
    "GlobalID": "e620957a-b892-4d1b-a204-19c95f5bdccd",
    "geometry": "LINESTRING (-90.179 36.586, -90.180 36.587)",
    "obj": "<bezpy.tl.transmissionline.TransmissionLine object at 0x168b0fb30>",
    "length": "7.373141015791231",
}


def make_csv_file(rows: list[dict], path: str) -> None:
    fieldnames = list(rows[0].keys())
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


# ---------------------------------------------------------------------------
# TransmissionLineRecord model tests
# ---------------------------------------------------------------------------


class TestTransmissionLineRecord:
    def test_parses_valid_row(self):
        record = TransmissionLineRecord(**SAMPLE_ROW)
        assert record.objectid == 17
        assert record.line_id == 140825

    def test_inferred_y_becomes_true(self):
        record = TransmissionLineRecord(**SAMPLE_ROW)
        assert record.inferred is True

    def test_inferred_n_becomes_false(self):
        row = {**SAMPLE_ROW, "INFERRED": "N"}
        record = TransmissionLineRecord(**row)
        assert record.inferred is False

    def test_sourcedate_parsed_as_date(self):
        record = TransmissionLineRecord(**SAMPLE_ROW)
        assert record.sourcedate == date(2017, 6, 1)

    def test_voltage_parsed_as_float(self):
        record = TransmissionLineRecord(**SAMPLE_ROW)
        assert record.voltage == 345.0

    def test_geometry_wkt_stored(self):
        record = TransmissionLineRecord(**SAMPLE_ROW)
        assert record.geometry_wkt.startswith("LINESTRING")

    def test_obj_column_ignored(self):
        record = TransmissionLineRecord(**SAMPLE_ROW)
        assert not hasattr(record, "obj")

    def test_empty_owner_becomes_none(self):
        row = {**SAMPLE_ROW, "OWNER": ""}
        record = TransmissionLineRecord(**row)
        assert record.owner is None

    def test_empty_voltage_becomes_none(self):
        row = {**SAMPLE_ROW, "VOLTAGE": ""}
        record = TransmissionLineRecord(**row)
        assert record.voltage is None

    def test_missing_geometry_raises(self):
        row = {**SAMPLE_ROW, "geometry": ""}
        with pytest.raises(ValidationError):
            TransmissionLineRecord(**row)

    def test_to_tuple_length(self):
        record = TransmissionLineRecord(**SAMPLE_ROW)
        t = record.to_tuple()
        assert len(t) == 20

    def test_to_tuple_order(self):
        record = TransmissionLineRecord(**SAMPLE_ROW)
        t = record.to_tuple()
        assert t[0] == 17  # objectid
        assert t[1] == 140825  # line_id
        assert t[18].startswith("LINESTRING")  # geometry_wkt


# ---------------------------------------------------------------------------
# DB integration tests (require live DB via conn fixture)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ingest_creates_rows(conn):
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, newline=""
    ) as f:
        tmp_path = f.name

    try:
        make_csv_file([SAMPLE_ROW], tmp_path)
        await ingest_transmission_lines_csv.fn(conn, tmp_path)
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM electric_transmission_lines WHERE objectid = 17"
        )
        assert count == 1
    finally:
        os.unlink(tmp_path)


@pytest.mark.asyncio
async def test_ingest_upsert_idempotent(conn):
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, newline=""
    ) as f:
        tmp_path = f.name

    try:
        make_csv_file([SAMPLE_ROW], tmp_path)
        await ingest_transmission_lines_csv.fn(conn, tmp_path)
        await ingest_transmission_lines_csv.fn(conn, tmp_path)
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM electric_transmission_lines WHERE objectid = 17"
        )
        assert count == 1
    finally:
        os.unlink(tmp_path)


@pytest.mark.asyncio
async def test_init_creates_table(conn):
    await initial_transmission_lines_db.fn(conn)
    exists = await conn.fetchval(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'electric_transmission_lines')"
    )
    assert exists is True


@pytest.mark.asyncio
async def test_ingest_skips_invalid_row(conn):
    test_objectid = 999999
    await conn.execute(
        "DELETE FROM electric_transmission_lines WHERE objectid = $1",
        test_objectid,
    )

    valid_row = {**SAMPLE_ROW, "OBJECTID": str(test_objectid)}
    bad_row = {**SAMPLE_ROW, "OBJECTID": "not_an_int", "geometry": ""}

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, newline=""
    ) as f:
        tmp_path = f.name

    try:
        make_csv_file([valid_row, bad_row], tmp_path)
        await ingest_transmission_lines_csv.fn(conn, tmp_path)

        count = await conn.fetchval(
            "SELECT COUNT(*) FROM electric_transmission_lines WHERE objectid = $1",
            test_objectid,
        )
        assert count == 1

        await conn.execute(
            "DELETE FROM electric_transmission_lines WHERE objectid = $1",
            test_objectid,
        )
    finally:
        os.unlink(tmp_path)
