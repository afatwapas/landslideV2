from sqlmodel import SQLModel, Field

class Location(SQLModel, table=True):
    __tablename__ = "locations"  
    lat: float= Field(default=None, primary_key=True)
    lon: float
    elevation: float
    lulc: int
    geomorph: int
    plancurv: float
    slop_deg: float
    spi: float
    twi: float
    aspect: float
    flowacc: float
