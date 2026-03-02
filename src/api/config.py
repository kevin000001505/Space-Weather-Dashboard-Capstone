from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


# Response Models for Flight States
class FlightState(BaseModel):
    icao24: str
    callsign: Optional[str]
    time: str
    time_pos: Optional[str]
    lat: Optional[float]
    lon: Optional[float]
    baro_altitude: Optional[float]
    geo_altitude: Optional[float]
    velocity: Optional[float]
    heading: Optional[float]
    vert_rate: Optional[float]
    on_ground: bool


class DRAPResponse(BaseModel):
    timestamp: datetime
    count: int
    points: List[List[float]]  # [lat, lon, intensity]
    query_time_ms: Optional[float] = None
    total_time_ms: Optional[float] = None


class FlightPathResponse(BaseModel):
    icao24: str
    callsign: Optional[str]
    path_geojson: dict


class ActivateFlightState(BaseModel):
    icao24: str
    callsign: Optional[str]
    lat: Optional[float]
    lon: Optional[float]
    geo_altitude: Optional[float]
    velocity: Optional[float]
    heading: Optional[float]
    on_ground: bool


class FlightStatesResponse(BaseModel):
    timestamp: str
    count: int
    flights: List[FlightState | ActivateFlightState]
    query_time_ms: float  # Add query execution time
    total_time_ms: float  # Add total endpoint time


class Airport(BaseModel):
    name: str
    iata_code: Optional[str] = None
    gps_code: Optional[str] = None
    type: Optional[str] = None
    municipality: Optional[str] = None
    country: Optional[str] = None
    elevation_ft: Optional[int] = None
    lat: float
    lon: float


class AirportsResponse(BaseModel):
    airports: List[Airport]
