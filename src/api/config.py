from typing import List, Optional, Dict, Any
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
    ident: str
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


class RunwayModel(BaseModel):
    id: int
    length_ft: Optional[int] = None
    width_ft: Optional[int] = None
    surface: Optional[str] = None
    lighted: Optional[bool] = None
    closed: Optional[bool] = None
    
    # Low End
    le_ident: Optional[str] = None
    le_elevation_ft: Optional[int] = None
    le_heading_degt: Optional[float] = None
    le_displaced_threshold_ft: Optional[int] = None
    le_geom: Optional[Dict[str, Any]] = None
    
    # High End
    he_ident: Optional[str] = None
    he_elevation_ft: Optional[int] = None
    he_heading_degt: Optional[float] = None
    he_displaced_threshold_ft: Optional[int] = None
    he_geom: Optional[Dict[str, Any]] = None

class FrequencyModel(BaseModel):
    id: int
    type: Optional[str] = None
    description: Optional[str] = None
    frequency_mhz: Optional[float] = None

class NavaidModel(BaseModel):
    id: int
    filename: Optional[str] = None
    ident: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    frequency_khz: Optional[int] = None
    elevation_ft: Optional[int] = None
    iso_country: Optional[str] = None
    dme_frequency_khz: Optional[int] = None
    dme_channel: Optional[str] = None
    dme_elevation_ft: Optional[int] = None
    slaved_variation_deg: Optional[float] = None
    magnetic_variation_deg: Optional[float] = None
    usagetype: Optional[str] = None
    power: Optional[str] = None
    associated_airport: Optional[str] = None
    geom: Optional[Dict[str, Any]] = None
    dme_geom: Optional[Dict[str, Any]] = None

class CommentModel(BaseModel):
    id: int
    subject: Optional[str] = None
    body: Optional[str] = None
    author: Optional[str] = None
    date: Optional[datetime] = None

class AirportDetailResponse(BaseModel):
    id: int
    ident: str
    type: Optional[str] = None
    name: str
    elevation_ft: Optional[float] = None
    continent: Optional[str] = None
    iso_country: Optional[str] = None
    iso_region: Optional[str] = None
    municipality: Optional[str] = None
    scheduled_service: Optional[bool] = None
    icao_code: Optional[str] = None
    iata_code: Optional[str] = None
    gps_code: Optional[str] = None
    local_code: Optional[str] = None
    home_link: Optional[str] = None
    wikipedia_link: Optional[str] = None
    keywords: Optional[str] = None
    geom: Optional[Dict[str, Any]] = None
    
    country_name: Optional[str] = None
    region_name: Optional[str] = None
    
    runways: List[RunwayModel] = []
    frequencies: List[FrequencyModel] = []
    navaids: List[NavaidModel] = []
    comments: List[CommentModel] = []


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


class AuroraResponse(BaseModel):
    observation_time: datetime
    forecast_time: datetime
    count: int
    coordinates: List[List[int]]  # [lon, lat, aurora]
    query_time_ms: Optional[float] = None
    total_time_ms: Optional[float] = None


class XRayResponse(BaseModel):
    time_tag: datetime
    satellite: int
    flux: float
    observed_flux: float
    electron_correction: float
    electron_contamination: bool
    energy: str


class XRayListResponse(BaseModel):
    xray_fluxes: List[XRayResponse]


class AlertResponse(BaseModel):
    time: datetime
    message: str


class AlertListResponse(BaseModel):
    data: List[AlertResponse]
