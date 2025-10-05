from tracemalloc import start
from flask import Flask, app, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime
import sqlite3
import requests
import subprocess
import pandas as pd
from retrievenasaforecastdata import get_nasa_forecast, nasa_forecast_to_csv
from retrievemeteforecastdata import get_meteomatics_forecast, meteomatics_json_to_csv

app = Flask(__name__)
CORS(app)

@app.route('/indexeyeofhorus.html')
def serve_html():
    return send_from_directory('.', 'indexeyeofhorus.html')

@app.route('/eyeofhorus', methods=['POST'])
def eyeofhorus():
    req_data = request.get_json()
    start = req_data.get('start')
    end = req_data.get('end')
    lat = req_data.get('lat')
    lon = req_data.get('lon')

    # Get NASA forecast
    nasa_json = get_nasa_forecast(start, end, lat, lon)
    df_nasa = nasa_forecast_to_csv(nasa_json, 'nasaforecast')

    # Get Meteomatics forecast
    try:
            meteo_json = get_meteomatics_forecast(start, end, lat, lon)
            df_meteo = meteomatics_json_to_csv(meteo_json, 'meteforecast')
    except Exception as e:
        print("Error fetching Meteomatics forecast:", e)
        # Create an empty DataFrame if fetch fails
        df_meteo = pd.DataFrame({'Date': df_nasa['Date']}) if 'Date' in df_nasa.columns else pd.DataFrame()

    # Combine both DataFrames on 'Date'
    # Drop Latitude, Longitude, Elevation columns if present
    drop_cols = [col for col in ['Latitude', 'Longitude', 'Elevation'] if col in df_nasa.columns]
    df_nasa = df_nasa.drop(columns=drop_cols, errors='ignore')
    drop_cols_meteo = [col for col in ['Latitude', 'Longitude', 'Elevation'] if col in df_meteo.columns]
    df_meteo = df_meteo.drop(columns=drop_cols_meteo, errors='ignore')
    for df in [df_nasa, df_meteo]:
        if 'Date' in df.columns:
            df['Date'] = df['Date'].apply(lambda d: datetime.strptime(str(d)[:10], "%Y-%m-%d").strftime("%Y%m%d") if '-' in str(d) else str(d))
    # Merge on Date
    df_combined = pd.merge(df_nasa, df_meteo, on='Date', how='outer')

    # Debug: print combined DataFrame and output structure
    #print("df_combined head:\n", df_combined.head())
    
    # Build JSON structure: dates as columns, parameters as rows
    dates = list(df_combined['Date'])
    param_cols = [col for col in df_combined.columns if col != 'Date']
    table = []
    for param in param_cols:
        row = {'parameter': param}
        for date in dates:
            value = df_combined.loc[df_combined['Date'] == date, param].values
            row[date] = value[0] if len(value) > 0 else None
        table.append(row)

    # Debug: print output JSON structure
    #print("jsonify output:\n", {"total": len(df_combined),"dates": dates,"table": table})

    return jsonify({
        "total": len(df_combined),
        "dates": dates,
        "table": table
    })

if __name__ == '__main__':
    app.run(port=5500, debug=False)