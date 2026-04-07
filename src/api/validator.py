from pydantic import TypeAdapter
from typing import List
from config import Airport, FlightStatesResponse


points_adapter = TypeAdapter(list[list[float | int]])
flight_response_adapter = TypeAdapter(FlightStatesResponse)
airports_adapter = TypeAdapter(List[Airport])
