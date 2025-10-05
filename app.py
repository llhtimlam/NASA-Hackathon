from tracemalloc import start
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS

import sqlite3
import requests
import subprocess
import pandas as pd
from retrievenasaforecastdata import get_nasa_forecast, nasa_forecast_to_csv
app = Flask(__name__)
CORS(app)


@app.route('/eyeofhorus', methods=['POST'])
def eyeofhorus():
    req_data = request.get_json()
    start = req_data.get('start')
    end = req_data.get('end')
    lat = req_data.get('lat')
    lon = req_data.get('lon')
    page = int(req_data.get('page', 1))
    page_size = int(req_data.get('page_size', 100))

    # Get NASA forecast data and convert to DataFrame
    data = get_nasa_forecast(start, end, lat, lon)
    df = nasa_forecast_to_csv(data, 'nasaforecast')

    # Exclude columns you don't want as parameters
    exclude_cols = {'Latitude', 'Longitude', 'Elevation'}
    param_cols = [col for col in df.columns if col not in exclude_cols and col != 'Date']

    # Paginate by date
    total = len(df)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    df_page = df.iloc[start_idx:end_idx]

    # Build table: rows are parameters, columns are dates
    dates = list(df_page['Date'])
    table = []
    for param in param_cols:
        row = {'parameter': param}
        for date in dates:
            value = df_page.loc[df_page['Date'] == date, param].values
            row[date] = value[0] if len(value) > 0 else None
        table.append(row)

    return jsonify({
        "page": page,
        "page_size": page_size,
        "total": total,
        "dates": dates,
        "table": table
    })

if __name__ == '__main__':
    app.run(port=5500, debug=False)