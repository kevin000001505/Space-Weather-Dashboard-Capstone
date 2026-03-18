import logging
from prefect import get_run_logger

def get_logger(name: str):
    """Returns Prefect logger in flow context, standard logger in tests."""
    try:
        return get_run_logger()
    except Exception:
        return logging.getLogger(name)