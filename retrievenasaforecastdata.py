import requests
import json
import pandas as pd
from datetime import datetime

def nasa_forecast_to_csv(json_data, name):
    """
    Converts NASA POWER API JSON to CSV with readable headers.
    """
    # Mapping for readable headers
    param_map = {
        "T2M": "Temperature (oC)",
        "T2M_MIN": "Minimum Temperature (oC)",
        "T2M_MAX": "Maximum Temperature (oC)",
        "T2MDEW": "Dew Point (oC)",
        "PRECTOTCORR": "Precipitation (mm/day)",
        "RH2M": "Relative Humidity (%)",
        "QV2M": "Specific Humidity (g/kg)",
        "WS10M": "Wind Speed (m/s)",
        "ALLSKY_SFC_SW_DWN": "All Sky Surface Shortwave Downward Irradiance (W/m^2)",
        "ALLSKY_SFC_LW_DWN": "All Sky Surface Longwave Downward Irradiance (W/m^2)"
    }
    coords = json_data['geometry']['coordinates']
    params = json_data['properties']['parameter']
    # Use T2M dates as reference
    dates = list(params['T2M'].keys())
    rows = []
    for d in dates:
        row = {
            'Date': datetime.strptime(d, '%Y%m%d').strftime('%Y-%m-%d'),
            'Latitude': coords[1],
            'Longitude': coords[0],
            'Elevation': coords[2] if len(coords) > 2 else None
        }
        for var in param_map.keys():
            row[param_map[var]] = params.get(var, {}).get(d, None)
        rows.append(row)
    df = pd.DataFrame(rows)
    df.to_csv(f'{name}.csv', index=False)
    print(f"Saved to {name}.csv")
    return df

def get_nasa_forecast(start, end, lat, lon, model="ensemble", scenario="ssp126"):
    url = "https://power.larc.nasa.gov/api/projection/daily/point"
    params = {
        "start": start,
        "end": end,
        "latitude": lat,
        "longitude": lon,
        "community": "ag",
        "parameters": "T2M,T2M_MIN,T2M_MAX,T2MDEW,PRECTOTCORR,RH2M,QV2M,WS10M,ALLSKY_SFC_SW_DWN,ALLSKY_SFC_LW_DWN",
        "format": "json",
        "user": "T123",
        "header": "true",
        "time-standard": "utc",
        "model": model,
        "scenario": scenario
    }
    headers = {
        "accept": "application/json"
    }
    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()

# Example usage
"""
data = get_nasa_forecast("20260101", "20281231", 43.47589488154674, -80.5321299441535, "ensemble", "ssp126")
with open('nasaforecast.json', 'w') as f:
    json.dump(data, f, indent=2)
data2 = nasa_forecast_to_csv(data, 'nasaforecast')
"""