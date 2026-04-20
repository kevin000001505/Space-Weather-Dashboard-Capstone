import re
from typing import Any


def parse_message_to_json(message: str) -> dict[str, Any]:
    lines = [l.strip() for l in message.strip().splitlines() if l.strip()]
    if not lines:
        return {}

    first = lines[0]
    type_match = re.match(
        r"^(ALERT|CONTINUED ALERT|WARNING|EXTENDED WARNING|CANCEL WARNING|"
        r"WATCH|CANCEL WATCH|SUMMARY|CANCEL SUMMARY):\s*(.+)?$",
        first, re.IGNORECASE,
    )
    msg_type = type_match.group(1).upper() if type_match else ""
    subject = (type_match.group(2) or "").strip() if type_match else first

    body_lines = lines[1:]
    impact_idx = next(
        (i for i, l in enumerate(body_lines) if l.lower().startswith("potential impacts:")),
        None,
    )
    field_lines = body_lines[:impact_idx] if impact_idx is not None else body_lines
    impact_lines = body_lines[impact_idx:] if impact_idx is not None else []

    fields: dict[str, str] = {}
    for line in field_lines:
        if ":" in line:
            k, _, v = line.partition(":")
            key = re.sub(r"\s+", "_", k.strip().lower())
            fields[key] = v.strip()

    impacts: list[str] = []
    if impact_lines:
        first_impact = impact_lines[0].partition(":")[2].strip()
        if first_impact:
            impacts.append(first_impact)
        impacts.extend(l for l in impact_lines[1:] if l)

    result: dict[str, Any] = {"type": msg_type, "subject": subject}
    if fields:
        result["fields"] = fields
    if impacts:
        result["potential_impacts"] = impacts
    return result
