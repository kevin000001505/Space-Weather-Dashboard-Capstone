from prefect.variables import Variable

async def variable_upsert(name: str, value: str) -> None:
    """Set a Prefect variable regardless of whether it exists yet."""
    existing = await Variable.get(name, default=None)
    if existing is not None:
        await Variable.set(name, value, overwrite=True)
    else:
        await Variable.set(name, value)