# tests/test_transforms/test_alert.py
import pytest
from tasks.alert import store_alert
from shared.alert_parser import parse_message_to_json


class TestFetchAlert:
    def test_returns_list(self, raw_alerts):
        assert isinstance(raw_alerts, list)
        assert len(raw_alerts) > 0


class TestParseAlerts:
    def test_returns_data(self, parsed_alerts):
        assert len(parsed_alerts) > 0

    def test_removes_noaa_scale_url(self, parsed_alerts):
        """Verify cleanup logic ran — URL should not appear in any message"""
        for record in parsed_alerts:
            assert "www.swpc.noaa.gov/noaa-scales-explanation" not in record.message

    def test_removes_noaa_scale_description_text(self, parsed_alerts):
        for record in parsed_alerts:
            assert (
                "NOAA Space Weather Scale descriptions can be found at"
                not in record.message
            )

    def test_removes_serial_number(self, parsed_alerts):
        for record in parsed_alerts:
            for line in record.message.splitlines():
                assert not line.startswith("Serial Number:")

    def test_removes_issue_time(self, parsed_alerts):
        for record in parsed_alerts:
            for line in record.message.splitlines():
                assert not line.startswith("Issue Time:")

    def test_removes_message_code(self, parsed_alerts):
        for record in parsed_alerts:
            assert "Space Weather Message Code:" not in record.message


class TestParseMessageToJson:
    ALERT_MSG = (
        "ALERT: Geomagnetic K-index of 6\n"
        "Threshold Reached: 2026 Apr 19 0859 UTC\n"
        "Synoptic Period: 0600-0900 UTC\n"
        "Active Warning: Yes\n"
        "NOAA Scale: G2 - Moderate\n\n"
        "Potential Impacts: Area of impact primarily poleward of 55 degrees.\n"
        "Induced Currents - Power grid fluctuations can occur."
    )

    WARNING_MSG = (
        "WARNING: Geomagnetic K-index of 5 expected\n"
        "Valid From: 2026 Apr 18 2348 UTC\n"
        "Valid To: 2026 Apr 19 0900 UTC\n"
        "Warning Condition: Onset\n"
        "NOAA Scale: G1 - Minor\n\n"
        "Potential Impacts: Area of impact primarily poleward of 60 degrees."
    )

    WATCH_MSG = (
        "WATCH: Geomagnetic Storm Category G2 Predicted\n\n"
        "Highest Storm Level Predicted by Day:\n"
        "Apr 17:  G2 (Moderate)   Apr 18:  G2 (Moderate)\n\n"
        "THIS SUPERSEDES ANY/ALL PRIOR WATCHES IN EFFECT\n\n"
        "Potential Impacts: Area of impact primarily poleward of 55 degrees."
    )

    SUMMARY_MSG = (
        "SUMMARY: X-ray Event exceeded M5\n"
        "Begin Time: 2026 Apr 04 0107 UTC\n"
        "Maximum Time: 2026 Apr 04 0117 UTC\n"
        "End Time: 2026 Apr 04 0123 UTC\n"
        "X-ray Class: M7.5\n"
        "NOAA Scale: R2 - Moderate\n\n"
        "Potential Impacts: Radio - Limited blackout of HF radio communication."
    )

    def test_alert_type_extracted(self):
        result = parse_message_to_json(self.ALERT_MSG)
        assert result["type"] == "ALERT"

    def test_alert_subject_extracted(self):
        result = parse_message_to_json(self.ALERT_MSG)
        assert result["subject"] == "Geomagnetic K-index of 6"

    def test_alert_fields_extracted(self):
        result = parse_message_to_json(self.ALERT_MSG)
        assert "fields" in result
        assert result["fields"]["noaa_scale"] == "G2 - Moderate"
        assert "threshold_reached" in result["fields"]

    def test_alert_impacts_extracted(self):
        result = parse_message_to_json(self.ALERT_MSG)
        assert "potential_impacts" in result
        assert len(result["potential_impacts"]) >= 1

    def test_warning_type(self):
        result = parse_message_to_json(self.WARNING_MSG)
        assert result["type"] == "WARNING"
        assert result["fields"]["warning_condition"] == "Onset"

    def test_watch_type(self):
        result = parse_message_to_json(self.WATCH_MSG)
        assert result["type"] == "WATCH"
        assert "G2 Predicted" in result["subject"]

    def test_summary_type(self):
        result = parse_message_to_json(self.SUMMARY_MSG)
        assert result["type"] == "SUMMARY"
        assert result["fields"]["x-ray_class"] == "M7.5"

    def test_empty_message_returns_empty_dict(self):
        assert parse_message_to_json("") == {}
        assert parse_message_to_json("   \n  ") == {}

    def test_parsed_alerts_have_valid_structure(self, parsed_alerts):
        for record in parsed_alerts:
            result = parse_message_to_json(record.message)
            assert isinstance(result, dict)
            assert "type" in result
            assert "subject" in result

    def test_parsed_alerts_type_is_known(self, parsed_alerts):
        known_types = {
            "ALERT", "CONTINUED ALERT", "WARNING", "EXTENDED WARNING",
            "CANCEL WARNING", "WATCH", "CANCEL WATCH", "SUMMARY", "CANCEL SUMMARY",
        }
        for record in parsed_alerts:
            result = parse_message_to_json(record.message)
            assert result["type"] in known_types, (
                f"Unknown type '{result['type']}' for alert_id={record.alert_id}"
            )


class TestStoreAlert:
    @pytest.mark.asyncio
    async def test_inserts_records(self, conn, parsed_alerts):
        await store_alert.fn(parsed_alerts, conn)
        count = await conn.fetchval("SELECT COUNT(*) FROM alerts")
        assert count > 0

    @pytest.mark.asyncio
    async def test_empty_list_does_nothing(self, conn):
        before = await conn.fetchval("SELECT COUNT(*) FROM alerts")

        await store_alert.fn([], conn)  # should not raise

        after = await conn.fetchval("SELECT COUNT(*) FROM alerts")
        assert after == before
