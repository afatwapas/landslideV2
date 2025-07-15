from sqlalchemy import Column, Integer, Float
from base import Base             # ✅ import from base.py

class Location(Base):
    __tablename__ = "location"

    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    lulc = Column(Float)
    geomorph = Column(Float)
    plancurv = Column(Float)
    slop_deg = Column(Float)
    spi = Column(Float)
    twi = Column(Float)
    aspect = Column(Float)
    flowacc = Column(Float)
    elevation = Column(Float)
