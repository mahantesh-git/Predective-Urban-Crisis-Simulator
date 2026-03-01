import requests
import json
import traceback

def test_weather():
    url = "https://archive-api.open-meteo.com/v1/archive?latitude=12.9716&longitude=77.5946&start_date=2020-01-01&end_date=2023-12-31&daily=temperature_2m_mean,rain_sum&timezone=Asia%2FKolkata"
    try:
        res = requests.get(url)
        print("Weather Daily Length:", len(res.json().get('daily', {}).get('time', [])))
    except Exception as e:
        print("Weather Error:")
        traceback.print_exc()

def test_aqi():
    url = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=12.9716&longitude=77.5946&start_date=2023-01-01&end_date=2023-01-31&hourly=us_aqi,dust&timezone=Asia%2FKolkata"
    try:
        res = requests.get(url)
        print("AQI Hourly Length:", len(res.json().get('hourly', {}).get('time', [])))
        print("AQI Keys:", res.json().get('hourly', {}).keys())
    except Exception as e:
        print("AQI Error:")
        traceback.print_exc()

test_weather()
test_aqi()
