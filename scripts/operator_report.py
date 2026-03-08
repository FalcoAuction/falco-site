import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


def _default_db_path() -> Path:
    return Path(__file__).resolve().parents[2] / "falco-distress-bots" / "data" / "falco.db"


def _to_iso(value):
    if not value:
        return ""
    try:
        return str(value)
    except Exception:
        return ""


def _fetch_scalar(cur, sql, params=()):
    row = cur.execute(sql, params).fetchone()
    if not row:
        return 0
    value = row[0]
    return int(value or 0)


def main():
    db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else _default_db_path()
    if not db_path.exists():
        print(json.dumps({"error": f"Missing bots database: {db_path}" }))
        raise SystemExit(1)

    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    total_leads = _fetch_scalar(cur, "SELECT COUNT(*) FROM leads")
    green_ready = _fetch_scalar(
        cur,
        "SELECT COUNT(*) FROM leads WHERE UPPER(COALESCE(auction_readiness, '')) = 'GREEN'",
    )
    uw_ready = _fetch_scalar(cur, "SELECT COUNT(*) FROM leads WHERE COALESCE(uw_ready, 0) = 1")
    packeted = _fetch_scalar(cur, "SELECT COUNT(DISTINCT lead_key) FROM packets")
    contact_ready = _fetch_scalar(
        cur,
        """
        SELECT COUNT(DISTINCT lead_key)
        FROM lead_field_provenance
        WHERE field_name IN ('trustee_phone_public', 'owner_phone_primary')
          AND field_value_text IS NOT NULL
          AND TRIM(field_value_text) != ''
        """,
    )

    recent_leads = [
        dict(row)
        for row in cur.execute(
            """
            SELECT
              lead_key,
              address,
              county,
              distress_type,
              falco_score_internal,
              auction_readiness,
              equity_band,
              dts_days,
              COALESCE(uw_ready, 0) AS uw_ready,
              first_seen_at,
              last_seen_at,
              score_updated_at
            FROM leads
            ORDER BY COALESCE(score_updated_at, last_seen_at, first_seen_at) DESC
            LIMIT 12
            """
        ).fetchall()
    ]

    top_candidates = [
        dict(row)
        for row in cur.execute(
            """
            SELECT
              l.lead_key,
              l.address,
              l.county,
              l.distress_type,
              l.falco_score_internal,
              l.auction_readiness,
              l.equity_band,
              l.dts_days,
              COALESCE(l.uw_ready, 0) AS uw_ready,
              MAX(p.created_at) AS latest_packet_at
            FROM leads l
            LEFT JOIN packets p ON p.lead_key = l.lead_key
            WHERE UPPER(COALESCE(l.auction_readiness, '')) = 'GREEN'
            GROUP BY
              l.lead_key, l.address, l.county, l.distress_type,
              l.falco_score_internal, l.auction_readiness, l.equity_band,
              l.dts_days, l.uw_ready
            ORDER BY
              COALESCE(l.dts_days, 9999) ASC,
              COALESCE(l.falco_score_internal, 0) DESC,
              COALESCE(MAX(p.created_at), '') DESC
            LIMIT 10
            """
        ).fetchall()
    ]

    recent_packets = [
        dict(row)
        for row in cur.execute(
            """
            SELECT
              p.lead_key,
              p.run_id,
              p.pdf_path,
              p.bytes,
              p.created_at,
              l.address,
              l.county,
              l.falco_score_internal,
              l.auction_readiness,
              l.dts_days
            FROM packets p
            LEFT JOIN leads l ON l.lead_key = p.lead_key
            ORDER BY p.created_at DESC
            LIMIT 12
            """
        ).fetchall()
    ]

    result = {
      "generatedAt": datetime.now(timezone.utc).isoformat(),
      "dbPath": str(db_path),
      "overview": {
        "totalLeads": total_leads,
        "greenReady": green_ready,
        "uwReady": uw_ready,
        "packeted": packeted,
        "contactReady": contact_ready,
      },
      "recentLeads": recent_leads,
      "topCandidates": top_candidates,
      "recentPackets": recent_packets,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
