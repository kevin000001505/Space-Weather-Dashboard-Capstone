from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional


class FlightStateRecord(BaseModel):
    """Flight state record for database insertion."""

    time: datetime = Field(description="Timestamp of the observation")
    icao24: str = Field(
        min_length=6, max_length=6, description="ICAO24 aircraft identifier"
    )
    callsign: Optional[str] = Field(
        default=None, max_length=8, description="Aircraft callsign"
    )
    origin_country: Optional[str] = Field(default=None, description="Country of origin")
    time_position: Optional[datetime] = Field(
        default=None, description="Last position update time"
    )
    latitude: Optional[float] = Field(
        default=None, ge=-90, le=90, description="Latitude"
    )
    longitude: Optional[float] = Field(
        default=None, ge=-180, le=180, description="Longitude"
    )
    geo_altitude: Optional[float] = Field(
        default=None, description="Geometric altitude in meters"
    )
    baro_altitude: Optional[float] = Field(
        default=None, description="Barometric altitude in meters"
    )
    velocity: Optional[float] = Field(
        default=None, ge=0, description="Ground speed in m/s"
    )
    heading: Optional[float] = Field(
        default=None, ge=0, lt=360, description="Track angle in degrees"
    )
    vertical_rate: Optional[float] = Field(
        default=None, description="Vertical rate in m/s"
    )
    on_ground: bool = Field(default=False, description="Aircraft on ground flag")
    squawk: Optional[str] = Field(
        default=None, max_length=4, description="Transponder squawk code"
    )
    spi: bool = Field(default=False, description="Special position identification flag")
    position_source: Optional[int] = Field(
        default=None, description="Position source type"
    )
    sensors: Optional[list] = Field(default=None, description="Sensor list")
    geom_lon: Optional[float] = Field(
        default=None, ge=-180, le=180, description="Geometry longitude"
    )
    geom_lat: Optional[float] = Field(
        default=None, ge=-90, le=90, description="Geometry latitude"
    )

    @field_validator("icao24")
    def validate_icao24(cls, v):
        """Ensure ICAO24 is stripped and lowercase."""
        return v.strip().lower() if v else v

    @field_validator("callsign")
    def validate_callsign(cls, v):
        """Strip whitespace from callsign."""
        return v.strip() if v else v

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg executemany."""
        return (
            self.time,
            self.icao24,
            self.callsign,
            self.origin_country,
            self.time_position,
            self.latitude,
            self.longitude,
            self.geo_altitude,
            self.baro_altitude,
            self.velocity,
            self.heading,
            self.vertical_rate,
            self.on_ground,
            self.squawk,
            self.spi,
            self.position_source,
            self.sensors,
            self.geom_lon,
            self.geom_lat,
        )

    class Config:
        """Pydantic configuration."""

        validate_assignment = True
        extra = "forbid"


class AirportRecord(BaseModel):
    """Airport record for database insertion."""

    ident: str = Field(description="Airport identifier")
    type: str = Field(description="Airport type")
    name: str = Field(description="Airport name")
    latitude_deg: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude_deg: Optional[float] = Field(default=None, ge=-180, le=180)
    elevation_ft: Optional[float] = Field(default=None)
    continent: Optional[str] = Field(default=None, max_length=2)
    country_name: Optional[str] = Field(default=None)
    iso_country: Optional[str] = Field(default=None, max_length=2)
    region_name: Optional[str] = Field(default=None)
    iso_region: Optional[str] = Field(default=None)
    local_region: Optional[str] = Field(default=None)
    municipality: Optional[str] = Field(default=None)
    scheduled_service: Optional[bool] = Field(default=None)
    gps_code: Optional[str] = Field(default=None)
    iata_code: Optional[str] = Field(default=None, max_length=3)
    icao_code: Optional[str] = Field(default=None, max_length=4)
    local_code: Optional[str] = Field(default=None)
    home_link: Optional[str] = Field(default=None)
    wikipedia_link: Optional[str] = Field(default=None)
    keywords: Optional[str] = Field(default=None)
    score: Optional[int] = Field(default=None)
    last_updated: Optional[datetime] = Field(default=None)

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg executemany."""
        return (
            self.ident,
            self.type,
            self.name,
            self.latitude_deg,
            self.longitude_deg,
            self.elevation_ft,
            self.continent,
            self.country_name,
            self.iso_country,
            self.region_name,
            self.iso_region,
            self.local_region,
            self.municipality,
            self.scheduled_service,
            self.gps_code,
            self.icao_code,
            self.iata_code,
            self.local_code,
            self.home_link,
            self.wikipedia_link,
            self.keywords,
            self.score,
            self.last_updated,
        )

    class Config:
        validate_assignment = True
        extra = "forbid"


class DrapRecord(BaseModel):
    """DRAP (D-Region Absorption Prediction) record for database insertion."""

    observed_at: datetime = Field(description="Observation timestamp")
    latitude: float = Field(ge=-90, le=90, description="Latitude")
    longitude: float = Field(ge=-180, le=180, description="Longitude")
    absorption: Optional[float] = Field(
        default=None, ge=0, description="Absorption value in dB"
    )

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg executemany."""
        return (
            self.observed_at,
            self.latitude,
            self.longitude,
            self.absorption,
        )

    class Config:
        validate_assignment = True
        extra = "forbid"


class XrayRecord(BaseModel):
    """X-ray flux record for database insertion."""

    time_tag: datetime = Field(description="Observation timestamp")
    satellite: int = Field(description="GOES satellite number")
    current_class: Optional[str] = Field(
        default=None, description="Current X-ray class"
    )
    current_ratio: Optional[float] = Field(
        default=None, ge=0, description="Current ratio"
    )
    current_int_xrlong: Optional[float] = Field(
        default=None, ge=0, description="Current integrated X-ray long"
    )
    begin_time: Optional[datetime] = Field(default=None, description="Event begin time")
    begin_class: Optional[str] = Field(default=None, description="Begin X-ray class")
    max_time: Optional[datetime] = Field(default=None, description="Maximum time")
    max_class: Optional[str] = Field(default=None, description="Maximum X-ray class")
    max_xrlong: Optional[float] = Field(default=None, description="Maximum X-ray long")
    end_time: Optional[datetime] = Field(default=None, description="Event end time")
    end_class: Optional[str] = Field(default=None, description="End X-ray class")
    max_ratio_time: Optional[datetime] = Field(
        default=None, description="Maximum ratio time"
    )
    max_ratio: Optional[float] = Field(default=None, ge=0, description="Maximum ratio")

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg executemany."""
        return (
            self.time_tag,
            self.satellite,
            self.current_class,
            self.current_ratio,
            self.current_int_xrlong,
            self.begin_time,
            self.begin_class,
            self.max_time,
            self.max_class,
            self.max_xrlong,
            self.end_time,
            self.end_class,
            self.max_ratio_time,
            self.max_ratio,
        )

    class Config:
        validate_assignment = True
        extra = "forbid"


class ProtonFluxPlot(BaseModel):
    """Proton flux plot record for database insertion."""

    time_tag: datetime = Field(description="Observation timestamp (UTC)")
    satellite: int = Field(description="GOES satellite number")
    flux_10_mev: Optional[float] = Field(
        default=None, ge=0, description="Proton flux >10 MeV"
    )
    flux_50_mev: Optional[float] = Field(
        default=None, ge=0, description="Proton flux >50 MeV"
    )
    flux_100_mev: Optional[float] = Field(
        default=None, ge=0, description="Proton flux >100 MeV"
    )
    flux_500_mev: Optional[float] = Field(
        default=None, ge=0, description="Proton flux >500 MeV"
    )

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg executemany."""
        return (
            self.time_tag,
            self.satellite,
            self.flux_10_mev,
            self.flux_50_mev,
            self.flux_100_mev,
            self.flux_500_mev,
        )

    class Config:
        validate_assignment = True
        extra = "forbid"


class KPIndexRecord(BaseModel):
    """KP index record for database insertion."""

    time_tag: datetime = Field(description="Observation timestamp (UTC)")
    kp: float = Field(ge=0, le=9, description="Kp index value")
    a_running: int = Field(ge=0, description="Running A index")
    station_count: int = Field(ge=0, description="Number of stations reporting")

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg executemany."""
        return (
            self.time_tag,
            self.kp,
            self.a_running,
            self.station_count,
        )

    class Config:
        validate_assignment = True
        extra = "forbid"
