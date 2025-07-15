from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Annotated
from datetime import datetime
from database import get_session
from models import Location
from sqlalchemy import func
import pickle
import pandas as pd

# Load model
with open("xgb_model2.pkl", "rb") as f:
    model = pickle.load(f)

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Change this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# User input schema
class UserInput(BaseModel):
    lat: float
    lon: float
    date: str
    temperature_2m_max: float
    temperature_2m_min: float
    rain_sum: float
    snowfall_sum: float
    windspeed_10m_max: float
    surface_pressure_mean: float

@app.post("/predict/")
def predict(user_input: UserInput, session: Annotated[Session, Depends(get_session)]):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Cannot make predictions.")

    # Find the nearest location in DB
    distance_sq = func.pow(Location.lat - user_input.lat, 2) + func.pow(Location.lon - user_input.lon, 2)
    stmt = select(Location).order_by(distance_sq).limit(1)
    dem = session.exec(stmt).first()

    if not dem:
        raise HTTPException(status_code=404, detail="Database appears to be empty. No location data found.")
    
    # Parse date to get month/day
    try:
        dt = datetime.strptime(user_input.date, "%Y-%m-%d")
        month = dt.month
        day = dt.day
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Build feature dictionary
    feature_dict = {
        "elevation": dem.elevation,
        "lulc": dem.lulc,
        "geomorph": dem.geomorph,
        "plancurv": dem.plancurv,
        "slop_deg": dem.slop_deg,
        "spi": dem.spi,
        "twi": dem.twi,
        "aspect": dem.aspect,
        "flowacc": dem.flowacc,
        "temperature_2m_max": user_input.temperature_2m_max,
        "temperature_2m_min": user_input.temperature_2m_min,
        "rain_sum": user_input.rain_sum,
        "snowfall_sum": user_input.snowfall_sum,
        "windspeed_10m_max": user_input.windspeed_10m_max,
        "surface_pressure_mean": user_input.surface_pressure_mean,
        "month": month,
        "day": day
    }

    df = pd.DataFrame([feature_dict])
    
    expected_feature_order = [
        'temperature_2m_max', 'temperature_2m_min', 'rain_sum', 'snowfall_sum',
        'windspeed_10m_max', 'surface_pressure_mean', 'lulc', 'geomorph',
        'plancurv', 'slop_deg', 'spi', 'twi', 'aspect', 'flowacc',
        'elevation', 'month', 'day'
    ]

    try:
        df_reordered = df[expected_feature_order]
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Missing feature in input: {e}")

    prediction = model.predict(df_reordered)[0]

    return {
        "lat": user_input.lat,
        "lon": user_input.lon,
        "closest_db_lat": dem.lat,
        "closest_db_lon": dem.lon,
        "prediction": int(prediction)
    }
