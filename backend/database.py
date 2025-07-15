from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from base import Base              # ✅ from base.py, not models.py
import pandas as pd
from models import Location

DATABASE_URL = "sqlite:///./data.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def create_db_and_tables():
    from models import Location   # ✅ import here to avoid circular import at top
    Base.metadata.create_all(bind=engine)

def init_db_from_csv():
    session = SessionLocal()
    try:
        df = pd.read_csv("meghalaya_dem.csv")  # Adjust path
        for _, row in df.iterrows():
            if pd.isnull(row["lat"]) or pd.isnull(row["lon"]):
                continue  # skip rows that violate NOT NULL
            loc = Location(
                lat=row["lat"],
                lon=row["lon"],
                lulc=row["lulc"],
                geomorph=row["geomorph"],
                plancurv=row["plancurv"],
                slop_deg=row["slop_deg"],
                spi=row["spi"],
                twi=row["twi"],
                aspect=row["aspect"],
                flowacc=row["flowacc"],
                elevation=row["elevation"]
            )
            session.add(loc)
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

