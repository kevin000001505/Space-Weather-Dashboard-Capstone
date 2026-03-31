from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from datetime import datetime
from typing import Optional, Any


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
        """Convert to tuple for asyncpg copy_records_to_table."""
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

    model_config = ConfigDict(validate_assignment=True, extra="forbid")


class BaseCSVModel(BaseModel):
    """Base model that automatically converts empty CSV strings to None."""

    @model_validator(mode="before")
    @classmethod
    def empty_strings_to_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Iterate through the dictionary and replace "" with None
            return {k: (None if v == "" else v) for k, v in data.items()}
        return data


class AirportRecord(BaseCSVModel):
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

    model_config = ConfigDict(validate_assignment=True, extra="ignore")  # Ignoring id


class CountryRecord(BaseCSVModel):
    id: int
    code: str
    name: Optional[str] = Field(default=None)
    continent: Optional[str] = Field(default=None)
    wikipedia_link: Optional[str] = Field(default=None)
    keywords: Optional[str] = Field(default=None)

    def to_tuple(self) -> tuple:
        return (
            self.id,
            self.code,
            self.name,
            self.continent,
            self.wikipedia_link,
            self.keywords,
        )

    model_config = ConfigDict(validate_assignment=True, extra="forbid")


class RegionRecord(BaseCSVModel):
    id: int
    code: str
    local_code: Optional[str] = Field(default=None)
    name: Optional[str] = Field(default=None)
    continent: Optional[str] = Field(default=None)
    iso_country: Optional[str] = Field(default=None)
    wikipedia_link: Optional[str] = Field(default=None)
    keywords: Optional[str] = Field(default=None)

    def to_tuple(self) -> tuple:
        return (
            self.id,
            self.code,
            self.local_code,
            self.name,
            self.continent,
            self.iso_country,
            self.wikipedia_link,
            self.keywords,
        )

    model_config = ConfigDict(validate_assignment=True, extra="forbid")


class FrequencyRecord(BaseCSVModel):
    id: int
    airport_ident: str
    type: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    frequency_mhz: Optional[float] = Field(default=None)

    def to_tuple(self) -> tuple:
        return (
            self.id,
            self.airport_ident,
            self.type,
            self.description,
            self.frequency_mhz,
        )

    model_config = ConfigDict(
        validate_assignment=True, extra="ignore"
    )  # Ignoring airport_ref


class RunwayRecord(BaseCSVModel):
    id: int
    airport_ident: str
    length_ft: Optional[int] = Field(default=None)
    width_ft: Optional[int] = Field(default=None)
    surface: Optional[str] = Field(default=None)
    lighted: Optional[bool] = Field(default=None)
    closed: Optional[bool] = Field(default=None)
    le_ident: Optional[str] = Field(default=None)
    le_latitude_deg: Optional[float] = Field(default=None)
    le_longitude_deg: Optional[float] = Field(default=None)
    le_elevation_ft: Optional[int] = Field(default=None)
    le_heading_degt: Optional[float] = Field(default=None, alias="le_heading_degT")
    le_displaced_threshold_ft: Optional[int] = Field(default=None)
    he_ident: Optional[str] = Field(default=None)
    he_latitude_deg: Optional[float] = Field(default=None)
    he_longitude_deg: Optional[float] = Field(default=None)
    he_elevation_ft: Optional[int] = Field(default=None)
    he_heading_degt: Optional[float] = Field(default=None, alias="he_heading_degT")
    he_displaced_threshold_ft: Optional[int] = Field(default=None)

    def to_tuple(self) -> tuple:
        return (
            self.id,
            self.airport_ident,
            self.length_ft,
            self.width_ft,
            self.surface,
            self.lighted,
            self.closed,
            self.le_ident,
            self.le_latitude_deg,
            self.le_longitude_deg,
            self.le_elevation_ft,
            self.le_heading_degt,
            self.le_displaced_threshold_ft,
            self.he_ident,
            self.he_latitude_deg,
            self.he_longitude_deg,
            self.he_elevation_ft,
            self.he_heading_degt,
            self.he_displaced_threshold_ft,
        )

    model_config = ConfigDict(validate_assignment=True, extra="ignore")


class NavaidRecord(BaseCSVModel):
    id: int
    filename: Optional[str] = Field(default=None)
    ident: Optional[str] = Field(default=None)
    name: Optional[str] = Field(default=None)
    type: Optional[str] = Field(default=None)
    frequency_khz: Optional[int] = Field(default=None)
    latitude_deg: Optional[float] = Field(default=None)
    longitude_deg: Optional[float] = Field(default=None)
    elevation_ft: Optional[int] = Field(default=None)
    iso_country: Optional[str] = Field(default=None)
    dme_frequency_khz: Optional[int] = Field(default=None)
    dme_channel: Optional[str] = Field(default=None)
    dme_latitude_deg: Optional[float] = Field(default=None)
    dme_longitude_deg: Optional[float] = Field(default=None)
    dme_elevation_ft: Optional[int] = Field(default=None)
    slaved_variation_deg: Optional[float] = Field(default=None)
    magnetic_variation_deg: Optional[float] = Field(default=None)
    usagetype: Optional[str] = Field(default=None, alias="usageType")
    power: Optional[str] = Field(default=None)
    associated_airport: Optional[str] = Field(default=None)

    def to_tuple(self) -> tuple:
        return (
            self.id,
            self.filename,
            self.ident,
            self.name,
            self.type,
            self.frequency_khz,
            self.latitude_deg,
            self.longitude_deg,
            self.elevation_ft,
            self.iso_country,
            self.dme_frequency_khz,
            self.dme_channel,
            self.dme_latitude_deg,
            self.dme_longitude_deg,
            self.dme_elevation_ft,
            self.slaved_variation_deg,
            self.magnetic_variation_deg,
            self.usagetype,
            self.power,
            self.associated_airport,
        )

    model_config = ConfigDict(validate_assignment=True, extra="ignore")


class CommentRecord(BaseCSVModel):
    id: Optional[int] = Field(default=None)
    airport_ident: str = Field(alias="airportIdent")
    subject: Optional[str] = Field(default=None)
    body: Optional[str] = Field(default=None)
    author: Optional[str] = Field(default=None, alias="memberNickname")
    date: Optional[datetime] = Field(default=None)

    def to_tuple(self) -> tuple:
        return (
            self.id,
            self.airport_ident,
            self.subject,
            self.body,
            self.author,
            self.date,
        )

    model_config = ConfigDict(
        populate_by_name=True, validate_assignment=True, extra="ignore"
    )


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

    model_config = ConfigDict(validate_assignment=True, extra="forbid")


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

    model_config = ConfigDict(validate_assignment=True, extra="forbid")


class AuroraRecord(BaseModel):
    """Aurora forecast record for database insertion."""

    observation_time: datetime = Field(description="Observation timestamp (UTC)")
    forecast_time: datetime = Field(description="Forecast timestamp (UTC)")
    longitude: float = Field(ge=-180, le=180, description="Longitude (-180 to 180)")
    latitude: float = Field(ge=-90, le=90, description="Latitude")
    aurora: int = Field(ge=0, le=100, description="Aurora probability (0-100)")

    @field_validator("longitude", mode="before")
    @classmethod
    def normalize_longitude(cls, v: float) -> float:
        """Normalize 0-359 longitude from NOAA API to -180/180 range."""
        if v > 180:
            return v - 360
        return v

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg copy_records_to_table."""
        return (
            self.observation_time,
            self.forecast_time,
            self.longitude,
            self.latitude,
            self.aurora,
        )

    model_config = ConfigDict(validate_assignment=True, extra="ignore")


class XraySixHourRecord(BaseModel):
    """X-ray 6-hour flux record for database insertion."""

    time_tag: datetime = Field(description="Observation timestamp")
    satellite: int = Field(description="GOES satellite number")
    flux: float = Field(description="Corrected X-ray flux (W/m²)")
    observed_flux: float = Field(description="Observed X-ray flux (W/m²)")
    electron_correction: float = Field(description="Electron correction applied (W/m²)")
    electron_contamination: bool = Field(description="Electron contamination flag")
    energy: str = Field(description="Energy band (e.g. '0.1-0.8nm')")

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg copy_records_to_table."""
        return (
            self.time_tag,
            self.satellite,
            self.flux,
            self.observed_flux,
            self.electron_correction,
            self.electron_contamination,
            self.energy,
        )

    model_config = ConfigDict(validate_assignment=True, extra="ignore")


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

    model_config = ConfigDict(validate_assignment=True, extra="forbid")


class GeoelectricRecord(BaseModel):
    """Geoelectric field record for database insertion."""

    observed_at: datetime = Field(description="Observation timestamp")
    longitude: float = Field(ge=-180, le=180, description="Longitude")
    latitude: float = Field(ge=-90, le=90, description="Latitude")
    ex: float = Field(description="North-South electric field component (mV/m)")
    ey: float = Field(description="East-West electric field component (mV/m)")
    e_magnitude: float = Field(description="sqrt of Ex and Ey")
    quality_flag: int = Field(ge=0, description="Data quality flag")
    distance_nearest_station: float = Field(
        ge=0, description="Distance to nearest magnetometer station (km)"
    )

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg copy_records_to_table."""
        return (
            self.observed_at,
            self.longitude,
            self.latitude,
            self.ex,
            self.ey,
            self.e_magnitude,
            self.quality_flag,
            self.distance_nearest_station,
        )

    model_config = ConfigDict(validate_assignment=True, extra="ignore")


class AlertRecord(BaseModel):
    """Alert record for database insertion."""

    alert_id: str = Field(description="Unique alert identifier")
    issue_datetime: datetime = Field(description="Alert timestamp")
    message: str = Field(description="Alert message")

    def to_tuple(self) -> tuple:
        """Convert to tuple for asyncpg executemany."""
        return (
            self.alert_id,
            self.issue_datetime,
            self.message,
        )

    model_config = ConfigDict(validate_assignment=True, extra="forbid")
