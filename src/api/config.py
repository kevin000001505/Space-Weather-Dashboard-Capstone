from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, date
from enum import Enum


class EventsResponseV2(BaseModel):
    timestamp: datetime
    points: List[float]  # [intensity]


class CompressedPointsPayload(BaseModel):
    values: List[float]
    bits: int
    count: int
    data: str


class CompressedEventsResponse(BaseModel):
    timestamp: datetime
    encoding: str = "delta-bitpack"
    points: CompressedPointsPayload


class EventType(str, Enum):
    drap = "drap"
    geoelectric = "geoelectric"
    aurora = "aurora"


class FlightPathResponse(BaseModel):
    icao24: str
    callsign: Optional[str]
    path_points: list[list[float]]
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


class KpIndexResponse(BaseModel):
    time_tag: datetime
    kp: float
    a_running: Optional[int] = None
    station_count: Optional[int] = None


class ProtonFluxResponse(BaseModel):
    time_tag: datetime
    satellite: int
    flux_10_mev: Optional[float] = None
    flux_50_mev: Optional[float] = None
    flux_100_mev: Optional[float] = None
    flux_500_mev: Optional[float] = None


class XRayResponse(BaseModel):
    time_tag: datetime
    satellite: int
    flux: float
    observed_flux: float
    electron_correction: float
    electron_contamination: bool
    energy: str


class AlertResponse(BaseModel):
    time: datetime
    message: str


class SnapshotResponseV2(BaseModel):
    requested_time: datetime
    observed_at: Optional[datetime] = None
    points: Optional[List[float]] = None


class TimeTestingData(BaseModel):
    start: float
    query_start: float
    query_end: float
    finish: float

    def result(self):
        return {
            "total_time_ms": round((self.finish - self.start) * 1000, 3),
            "query_time_ms": round((self.query_end - self.query_start) * 1000, 3),
        }


class LocationData(BaseModel):
    drap: List[List[float]]
    aurora: List[List[float]]
    geoelectric: List[List[float]]


class FlightPathRangeResponse(BaseModel):
    requested_time: List[datetime]
    time: List[Optional[datetime]]
    points: List[Optional[Dict[str, Any]]]


class FlightDRAPAlertItem(BaseModel):
    time: datetime
    time_pos: Optional[datetime] = None
    icao24: str
    callsign: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    geo_altitude: Optional[float] = None
    velocity: Optional[float] = None
    heading: Optional[float] = None
    vert_rate: Optional[float] = None
    drap_observed_at: datetime
    absorption: float


class FlightDRAPAlertsResponse(BaseModel):
    timestamp: datetime
    threshold: float
    count: int
    alerts: List[FlightDRAPAlertItem]


class TransmissionLineResponse(BaseModel):
    objectid: int
    line_id: int
    type: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    voltage: Optional[float] = None
    volt_class: Optional[str] = None
    inferred: Optional[bool] = None
    sub_1: Optional[str] = None
    sub_2: Optional[str] = None
    sourcedate: Optional[date] = None
    val_date: Optional[date] = None
    shape_len: Optional[float] = None
    global_id: Optional[str] = None
    geom: Optional[Dict[str, Any]] = None
    length: Optional[float] = None
