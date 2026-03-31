from pydantic import TypeAdapter


points_adapter = TypeAdapter(list[list[float]])
