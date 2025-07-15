from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy import func  # Import the 'func' function from SQLAlchemy
from database import engine, create_db_and_tables, init_db_from_csv
from models import Location
import pandas as pd
import pickle
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# Initialize app
app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # adjust for frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model on startup
# Use a try-except block for safer file handling
try:
    with open("xgb_model2.pkl", "rb") as f:
        model = pickle.load(f)
except FileNotFoundError:
    model = None # Handle case where model is not found

@app.on_event("startup")
def startup():
    # Check if the model was loaded successfully
    if model is None:
        print("WARNING: Could not load 'xgb_model2.pkl'. The /predict/ endpoint will not work.")
    
    print("Creating database and tables...")
    create_db_and_tables()
    print("Initializing database from CSV...")
    init_db_from_csv()
    print("Startup complete.")


# Define expected input
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
def predict(user_input: UserInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Cannot make predictions.")

    with Session(engine) as session:
        # Instead of looking for an exact match (which is bad for floats),
        # we now find the nearest location in the database.
        distance_sq = func.pow(Location.lat - user_input.lat, 2) + func.pow(Location.lon - user_input.lon, 2)
        stmt = select(Location).order_by(distance_sq).limit(1)
        dem = session.exec(stmt).first()

        # This check now ensures the database isn't empty.
        if not dem:
            raise HTTPException(status_code=404, detail="Database appears to be empty. No location data found.")
        
        # ⏳ Parse month from date
        try:
            dt = datetime.strptime(user_input.date, "%Y-%m-%d")
            month = dt.month
            day = dt.day
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

        # Merge user + DEM into dict with correct model feature names
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

        # Create DataFrame from the dictionary
        df = pd.DataFrame([feature_dict])
        
        expected_feature_order = [
            'temperature_2m_max', 'temperature_2m_min', 'rain_sum', 'snowfall_sum',
            'windspeed_10m_max', 'surface_pressure_mean', 'lulc', 'geomorph',
            'plancurv', 'slop_deg', 'spi', 'twi', 'aspect', 'flowacc',
            'elevation', 'month', 'day'
        ]
        
        # Reorder the DataFrame columns
        try:
            df_reordered = df[expected_feature_order]
        except KeyError as e:
            raise HTTPException(status_code=500, detail=f"A required feature is missing from the data: {e}")


        # Predict using the reordered DataFrame
        prediction = model.predict(df_reordered)[0]

        return {
            "lat": user_input.lat,
            "lon": user_input.lon,
            "closest_db_lat": dem.lat, # Return the matched coordinates for debugging
            "closest_db_lon": dem.lon,
            "prediction": int(prediction)
        }