from pydantic import TypeAdapter

from config import FlightStatesResponse


points_adapter = TypeAdapter(list[list[float]])
flight_response_adapter = TypeAdapter(FlightStatesResponse)