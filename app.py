from tracemalloc import start
from flask import Flask, render_template, jsonify, request
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

    # Paginate by date
    total = len(df)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    df_page = df.iloc[start_idx:end_idx]

    # Parcel each parameter as its own table
    tables = {}
    date_col = 'date' if 'date' in df_page.columns else df_page.columns[0]
    for col in df_page.columns:
        if col == date_col:
            continue
        tables[col] = [
            {date_col: row[date_col], col: row[col]}
            for _, row in df_page.iterrows()
        ]

    return jsonify({
        "page": page,
        "page_size": page_size,
        "total": total,
        "tables": tables
    })

if __name__ == '__main__':
    app.run(debug=False)

'''
@app.route('/insert', methods=['POST'])
def insert_data():
    data = request.get_json()
    value = data.get('value')
    conn = sqlite3.connect('your_database.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO your_table (column_name) VALUES (?)', (value,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Data inserted successfully!'})

@app.route('/data')
def get_data():
    conn = sqlite3.connect('your_database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM your_table')
    rows = cursor.fetchall()
    conn.close()
    # Convert rows to list of dicts if needed
    data = [dict(zip([column[0] for column in cursor.description], row)) for row in rows]
    return jsonify(data)

if __name__ == '__main__':
    app.run()
'''