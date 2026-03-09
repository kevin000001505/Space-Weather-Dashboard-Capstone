from prefect import flow, get_run_logger
from tasks.alert import fetch_alerts, parse_alerts, store_alert


@flow(
    log_prints=True,
    description="ETL flow for alerts data extraction.",
)
async def alerts_extract_flow():
    logger = get_run_logger()

    try:
        raw_alerts = fetch_alerts()
        alert_records = parse_alerts(raw_alerts)
        await store_alert(alert_records)
        logger.info("Alerts data extraction and ingestion completed successfully!")
    except Exception as e:
        logger.error(f"Alerts data extraction failed: {e}")
        raise
