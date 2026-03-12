from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


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
    number_of_points: int


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
    flights: List[ActivateFlightState]
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


class KpIndexResponse(BaseModel):
    time_tag: datetime
    kp: float
    a_running: Optional[int] = None
    station_count: Optional[int] = None


class KpIndexListResponse(BaseModel):
    indices: List[KpIndexResponse]


class ProtonFluxResponse(BaseModel):
    time_tag: datetime
    satellite: int
    flux_10_mev: Optional[float] = None
    flux_50_mev: Optional[float] = None
    flux_100_mev: Optional[float] = None
    flux_500_mev: Optional[float] = None


class ProtonFluxListResponse(BaseModel):
    data: List[ProtonFluxResponse]


class XRayResponse(BaseModel):
    time_tag: datetime
    satellite: int
    current_class: Optional[str] = None
    current_ratio: Optional[float] = None
    current_int_xrlong: Optional[float] = None
    begin_time: Optional[datetime] = None
    begin_class: Optional[str] = None
    max_time: Optional[datetime] = None
    max_class: Optional[str] = None
    max_xrlong: Optional[float] = None
    end_time: Optional[datetime] = None
    end_class: Optional[str] = None
    max_ratio_time: Optional[datetime] = None
    max_ratio: Optional[float] = None


class XRayListResponse(BaseModel):
    xray_fluxes: List[XRayResponse]
