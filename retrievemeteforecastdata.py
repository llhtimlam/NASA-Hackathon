import requests
import json
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv("metologin.env")
username = os.getenv("METEOMATICS_USERNAME")
password = os.getenv("METEOMATICS_PASSWORD")
'''
Set your environment variables locally (not in your repo):

On Windows (Command Prompt):
set METEOMATICS_USERNAME=your_username
set METEOMATICS_PASSWORD=your_password

On Linux/macOS:
export METEOMATICS_USERNAME=your_username
export METEOMATICS_PASSWORD=your_password
'''
def meteomatics_json_to_csv(json_data, output_file='meteomatics_forecast.csv'):
    param_map = {
        "heat_index:C": "Heat Index (oC)",
        "t_apparent:C": "Apparent Temperature (oC)",
        "frost_warning_24h:idx": "Frost Warning",
        "heavy_rain_warning_24h:idx": "Heavy Rain Warning",
        "wind_warning_24h:idx": "Wind Warning"
    }
    def frost_rain_desc(idx):
        mapping = {0: "No frost", 1: "Frost", 2: "Severe Frost"}
        try: return mapping[int(float(idx))]
        except: return ""
    def heavy_rain_desc(idx):
        mapping = {0: "No Severe Rainfall", 1: "Heavy Rainfall", 2: "Severe Rainfall", 3: "Extreme Rainfall"}
        try: return mapping[int(float(idx))]
        except: return ""
    def wind_desc(idx):
        mapping = {0: "No Severe Wind", 1: "Wind Gusts", 2: "Squall", 3: "Severe Squall", 4: "Violent Squall", 5: "Gale-Force Winds", 6: "Extreme Gale-Force Winds"}
        try: return mapping[int(float(idx))]
        except: return ""
    def heat_index_description(value):
        try: v = float(value)
        except: return ""
        if v < 26: return "No Heat Hazard"
        elif v < 32: return "Caution"
        elif v < 41: return "Extreme Caution"
        elif v < 54: return "Danger"
        else: return "Extreme Danger"

    # Use a dict to collect rows by (date, lat, lon)
    row_dict = {}
    for param in json_data.get('data', []):
        parameter = param.get('parameter')
        readable = param_map.get(parameter, parameter)
        for coord in param.get('coordinates', []):
            lat = coord.get('lat')
            lon = coord.get('lon')
            for entry in coord.get('dates', []):
                date = entry.get('date')
                try:
                    date_fmt = datetime.strptime(date[:10], "%Y-%m-%d").strftime("%Y%m%d")
                except Exception:
                    date_fmt = date
                key = (date_fmt, lat, lon)
                if key not in row_dict:
                    row_dict[key] = {
                        'Date': date_fmt,
                        'Latitude': lat,
                        'Longitude': lon
                    }
                value = entry.get('value')
                # Assign values or descriptions
                if parameter == "heat_index:C":
                    row_dict[key]["Heat Index (oC)"] = value
                    row_dict[key]["Heat Index Label"] = heat_index_description(value)
                elif parameter == "t_apparent:C":
                    row_dict[key]["Apparent Temperature (oC)"] = value
                elif parameter == "frost_warning_24h:idx":
                    row_dict[key]["Frost Warning"] = frost_rain_desc(value)
                elif parameter == "heavy_rain_warning_24h:idx":
                    row_dict[key]["Heavy Rain Warning"] = heavy_rain_desc(value)
                elif parameter == "wind_warning_24h:idx":
                    row_dict[key]["Wind Warning"] = wind_desc(value)
                else:
                    row_dict[key][readable] = value
    # Convert dict to DataFrame
    df = pd.DataFrame(list(row_dict.values()))
    cols = [
        'Date', 'Latitude', 'Longitude',
        'Heat Index (oC)', 'Heat Index Label',
        'Apparent Temperature (oC)',
        'Frost Warning', 'Heavy Rain Warning', 'Wind Warning'
    ]
    cols = [c for c in cols if c in df.columns]
    df = df[cols]
    df.to_csv(output_file, index=False)
    print(f"Saved to {output_file}")
    return df

def get_meteomatics_forecast(start_date, end_date, lat, lon, username, password):
    """
    Query Meteomatics API for custom date range and location.
    Dates must be in ISO format: YYYY-MM-DDTHH:MM:SS.000Z
    Example: '2026-11-27T00:00:00.000Z'
    """
    # Build the query string
    query = (
        f"{start_date}--{end_date}:P1D/"
        "frost_warning_24h:idx,heat_index:C,heavy_rain_warning_24h:idx,"
        "wind_warning_24h:idx,t_apparent:C/"
        f"{lat},{lon}/json?model=mix"
    )
    url = f"https://api.meteomatics.com/{query}"

    # Basic authentication
    response = requests.get(url, auth=(username, password))
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None

# Example usage
"""
data = get_meteomatics_forecast("2026-01-01T00:00:00.000Z", "2028-12-31T00:00:00.000Z", 43.47589488154674, -80.5321299441535, username, password)
with open('meteforecast.json', 'w') as f:
    json.dump(data, f, indent=2)
data2 = meteomatics_json_to_csv(data, 'meteforecastdata.csv')
"""