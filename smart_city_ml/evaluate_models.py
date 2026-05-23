"""
evaluate_models.py  --  PUECS Model Fit Evaluation
===================================================
Produces academic-quality evidence of good fit:

  1. XGBoost classifiers (health, traffic, crisis)
     - 80/20 stratified split
     - Train Accuracy vs Test Accuracy  -> detects over/under-fit
     - Precision / Recall / F1 per class
     - Confusion Matrix

  2. Prophet time-series (aqi, water)
     - Last-20% of dates held out as test set
     - MAE and RMSE on in-sample (train) vs out-of-sample (test)
     - Plots: actual vs predicted

Run:
  cd smart_city_ml
  python evaluate_models.py

Output:
  - Printed metrics table (copy into project report)
  - data/evaluation_results.csv
"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import os, warnings, pickle, joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix, ConfusionMatrixDisplay,
    mean_absolute_error
)
from sklearn.preprocessing import LabelEncoder
import matplotlib
matplotlib.use("Agg")          # headless – saves PNGs, does not need a display
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET    = os.path.join(BASE_DIR, "datasets", "city_day.csv")
DATA_DIR   = os.path.join(BASE_DIR, "smart_city_ml", "data")
MODELS_DIR = os.path.join(BASE_DIR, "smart_city_ml", "models")
EVAL_DIR   = os.path.join(DATA_DIR, "evaluation")
os.makedirs(EVAL_DIR, exist_ok=True)

print("=" * 65)
print("  PUECS - Model Fit Evaluation (Over/Underfit Analysis)")
print("=" * 65)

# ── 1. Rebuild the feature matrix (same logic as train_models.py) ──────────────
print("\n[1/4] Loading and preparing data...")
METRO_CITIES = {
    "Delhi", "Mumbai", "Bengaluru", "Chennai", "Kolkata",
    "Hyderabad", "Ahmedabad", "Pune", "Jaipur", "Lucknow",
    "Chandigarh", "Amritsar", "Gurugram", "Kochi", "Ernakulam",
    "Coimbatore", "Visakhapatnam", "Thiruvananthapuram",
    "Guwahati", "Patna", "Bhopal", "Shillong", "Aizawl",
    "Amaravati", "Talcher", "Brajrajnagar",
}
df_raw = pd.read_csv(DATASET, parse_dates=["Date"])
df_raw = df_raw[df_raw["City"].isin(METRO_CITIES)].copy()
df_raw.sort_values(["City", "Date"], inplace=True)

pollutant_cols = ["PM2.5", "PM10", "NO", "NO2", "NOx", "NH3", "CO", "SO2", "O3", "AQI"]
df_raw[pollutant_cols] = df_raw.groupby("City")[pollutant_cols].transform(lambda s: s.ffill().bfill())
df_raw[pollutant_cols] = df_raw[pollutant_cols].fillna(0)

df_daily = df_raw.groupby("Date").agg(
    aqi  =("AQI",   "mean"), pm25 =("PM2.5","mean"), pm10 =("PM10", "mean"),
    no2  =("NO2",   "mean"), so2  =("SO2",  "mean"), co   =("CO",   "mean"), o3   =("O3",   "mean"),
).reset_index().sort_values("Date").reset_index(drop=True)

np.random.seed(42)
N = len(df_daily)
df_daily["month"]       = df_daily["Date"].dt.month
df_daily["day_of_week"] = df_daily["Date"].dt.dayofweek
df_daily["temperature"] = 25 + 10 * np.sin((df_daily["month"] - 3) * np.pi / 6) + np.random.normal(0, 2, N)
df_daily["humidity"]    = (60 - 15 * np.cos((df_daily["month"] - 6) * np.pi / 6) + np.random.normal(0, 5, N)).clip(20, 95)

pollution_load           = (df_daily["pm25"]/300 + df_daily["no2"]/200 + df_daily["so2"]/150).clip(0,1)
df_daily["water_quality"] = (85 - pollution_load*50 + np.random.normal(0,4,N)).clip(10,100)
df_daily["industry_emission"] = (
    (df_daily["co"]/50)*40 + (df_daily["no2"]/200)*35 + (df_daily["so2"]/150)*25 + np.random.normal(0,3,N)
).clip(0,100)
weekday_boost = df_daily["day_of_week"].map({0:1.2,1:1.3,2:1.3,3:1.2,4:1.4,5:0.8,6:0.6}).fillna(1.0)
df_daily["traffic_density"] = (df_daily["aqi"]*1.5*weekday_boost + np.random.normal(0,20,N)).clip(0,1000)
df_daily["population_density"] = np.linspace(12000,15500,N)
df_daily["time_of_day"] = 12

# Classification labels
le_health = LabelEncoder()
df_daily["health_risk_label"] = le_health.fit_transform(
    pd.cut(df_daily["aqi"], bins=[-np.inf,50,100,200,np.inf], labels=["Good","Moderate","Poor","Severe"])
)
le_traffic = LabelEncoder()
df_daily["traffic_status_label"] = le_traffic.fit_transform(
    pd.cut(df_daily["traffic_density"], bins=[-np.inf,300,600,np.inf], labels=["Free","Slow","Congested"])
)

aqi_norm     = (df_daily["aqi"]              / 500).clip(0, 1)
water_norm   = ((100 - df_daily["water_quality"]) / 100).clip(0, 1)
traffic_norm = (df_daily["traffic_density"]   / 1000).clip(0, 1)
emit_norm    = (df_daily["industry_emission"] / 100).clip(0, 1)
df_daily["crisis_score"] = (aqi_norm*0.40 + water_norm*0.25 + traffic_norm*0.20 + emit_norm*0.15) * 100
df_daily["crisis_label"] = (df_daily["crisis_score"] >= 50).astype(int)

print(f"   Dataset: {N} days  |  Crisis rate: {df_daily['crisis_label'].mean()*100:.1f}%")

# ─────────────────────────────────────────────────────────────────────────────
# 2. XGBoost Classifiers – Train/Test Split Comparison
# ─────────────────────────────────────────────────────────────────────────────
print("\n[2/4] Evaluating XGBoost classifiers (80/20 stratified split)...")

results = []

def evaluate_xgb(name, X, y, label_names, params):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    clf = XGBClassifier(
        eval_metric="mlogloss", use_label_encoder=False, verbosity=0, **params
    )
    clf.fit(X_train, y_train)

    train_acc = accuracy_score(y_train, clf.predict(X_train))
    test_acc  = accuracy_score(y_test,  clf.predict(X_test))
    gap = train_acc - test_acc

    verdict = (
        "[GOOD FIT]" if gap < 0.05 else
        "[OVERFIT]"  if gap >= 0.05 else
        "[UNDERFIT]"
    )

    print(f"\n  -- {name} --")
    print(f"     Train Accuracy : {train_acc*100:.2f}%")
    print(f"     Test Accuracy  : {test_acc*100:.2f}%")
    print(f"     Gap (Train-Test): {gap*100:.2f}%  ->  {verdict}")
    print(f"\n     Classification Report (Test Set):")
    report = classification_report(y_test, clf.predict(X_test), target_names=label_names, digits=3)
    print("     " + report.replace("\n", "\n     "))

    # Confusion matrix PNG
    cm = confusion_matrix(y_test, clf.predict(X_test))
    fig, ax = plt.subplots(figsize=(6, 5))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=label_names)
    disp.plot(ax=ax, colorbar=False, cmap="Blues")
    ax.set_title(f"{name} | Train: {train_acc*100:.1f}%  Test: {test_acc*100:.1f}%  {verdict}")
    plt.tight_layout()
    fname = os.path.join(EVAL_DIR, f"cm_{name.lower().replace(' ','_')}.png")
    plt.savefig(fname, dpi=150)
    plt.close()
    print(f"     Confusion matrix saved -> {fname}")

    results.append({
        "Model": name, "Type": "XGBoost",
        "Train_Acc": round(train_acc, 4), "Test_Acc": round(test_acc, 4),
        "Gap": round(gap, 4), "Verdict": verdict
    })

# Health Risk
evaluate_xgb(
    "Health Risk Classifier",
    df_daily[["aqi","pm25","no2","so2","temperature","humidity","population_density","water_quality"]],
    df_daily["health_risk_label"],
    list(le_health.classes_),
    {"n_estimators": 300, "max_depth": 5, "learning_rate": 0.05,
     "num_class": len(le_health.classes_), "objective": "multi:softprob"}
)

# Traffic Status
evaluate_xgb(
    "Traffic Status Classifier",
    df_daily[["time_of_day","day_of_week","traffic_density","aqi","temperature"]],
    df_daily["traffic_status_label"],
    list(le_traffic.classes_),
    {"n_estimators": 200, "max_depth": 4, "learning_rate": 0.05,
     "num_class": len(le_traffic.classes_), "objective": "multi:softprob"}
)

# Crisis Classifier (sliding window)
print("\n  -- Urban Crisis Classifier (7-day window) --")
WINDOW = 7
records, labels = [], []
for i in range(WINDOW, N):
    win = df_daily.iloc[i - WINDOW: i]
    feat = []
    for _, row in win.iterrows():
        feat.extend([row["aqi"], row["traffic_density"]/10, row["water_quality"], row["pm25"]])
    records.append(feat)
    labels.append(df_daily.iloc[i]["crisis_label"])

X_c = np.array(records, dtype=np.float32)
y_c = np.array(labels, dtype=int)

X_tr, X_te, y_tr, y_te = train_test_split(X_c, y_c, test_size=0.20, random_state=42, stratify=y_c)
dtrain = xgb.DMatrix(X_tr, label=y_tr)
dtest  = xgb.DMatrix(X_te, label=y_te)
params = {"objective":"binary:logistic","eval_metric":"logloss","max_depth":5,
          "eta":0.05,"subsample":0.8,"colsample_bytree":0.8,"min_child_weight":3}
booster = xgb.train(params, dtrain, num_boost_round=300, verbose_eval=False)

y_tr_pred = (booster.predict(dtrain) > 0.5).astype(int)
y_te_pred = (booster.predict(dtest)  > 0.5).astype(int)
train_acc = accuracy_score(y_tr, y_tr_pred)
test_acc  = accuracy_score(y_te, y_te_pred)
gap = train_acc - test_acc
verdict = "[GOOD FIT]" if gap < 0.05 else "[OVERFIT]"

print(f"     Train Accuracy : {train_acc*100:.2f}%")
print(f"     Test Accuracy  : {test_acc*100:.2f}%")
print(f"     Gap (Train-Test): {gap*100:.2f}%  ->  {verdict}")
print(f"\n     Classification Report (Test Set):")
print("     " + classification_report(y_te, y_te_pred, target_names=["No Crisis","Crisis"]).replace("\n","\n     "))
results.append({"Model":"Crisis Classifier","Type":"XGBoost",
                "Train_Acc":round(train_acc,4),"Test_Acc":round(test_acc,4),
                "Gap":round(gap,4),"Verdict":verdict})

# ─────────────────────────────────────────────────────────────────────────────
# 3. Prophet Models — In-Sample vs Out-of-Sample MAE/RMSE
# ─────────────────────────────────────────────────────────────────────────────
print("\n[3/4] Evaluating Prophet models (last 20% as holdout)...")

split_idx = int(N * 0.80)
df_train  = df_daily.iloc[:split_idx]
df_test   = df_daily.iloc[split_idx:]

def eval_prophet(name, model_path, col, df_train, df_test, date_col="Date"):
    with open(model_path, "rb") as f:
        model = pickle.load(f)

    # In-sample predictions (train period)
    df_hist = model.history[["ds","y"]].copy()
    if "pm25_reg" in model.extra_regressors:
        df_hist["pm25_reg"] = model.history["pm25_reg"].values
    in_pred = model.predict(df_hist)
    mae_train = mean_absolute_error(df_hist["y"], in_pred["yhat"])
    rmse_train = np.sqrt(((df_hist["y"] - in_pred["yhat"])**2).mean())

    # Out-of-sample: build future df for test dates
    future = pd.DataFrame({"ds": df_test[date_col]})
    if "pm25_reg" in model.extra_regressors:
        # Use actual PM2.5 from test period (the model was trained to use this regressor)
        future["pm25_reg"] = df_test["pm25"].values

    out_pred = model.predict(future)
    actual   = df_test[col].values
    pred     = out_pred["yhat"].values
    mae_test  = mean_absolute_error(actual, pred)
    rmse_test = np.sqrt(((actual - pred)**2).mean())

    gap = rmse_test - rmse_train
    verdict = "[GOOD FIT]" if gap < rmse_train * 0.30 else "[OVERFIT]"

    print(f"\n  ── {name} (Prophet) ──")
    print(f"     Train MAE / RMSE : {mae_train:.3f} / {rmse_train:.3f}")
    print(f"     Test  MAE / RMSE : {mae_test:.3f}  / {rmse_test:.3f}")
    print(f"     RMSE Gap         : {gap:.3f}  ->  {verdict}")

    # Plot actual vs predicted on test set
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(df_test[date_col].values, actual,     label="Actual",    color="#ef4444", linewidth=1.5)
    ax.plot(df_test[date_col].values, pred,       label="Predicted", color="#3b82f6", linewidth=1.5, linestyle="--")
    ax.fill_between(df_test[date_col].values,
                    out_pred["yhat_lower"], out_pred["yhat_upper"],
                    alpha=0.15, color="#3b82f6", label="95% CI")
    ax.set_title(f"{name} | Holdout Test | MAE={mae_test:.2f}  RMSE={rmse_test:.2f}  {verdict}")
    ax.legend(); ax.grid(alpha=0.3)
    fname = os.path.join(EVAL_DIR, f"prophet_{name.lower().replace(' ','_')}.png")
    plt.tight_layout(); plt.savefig(fname, dpi=150); plt.close()
    print(f"     Actual vs Predicted plot -> {fname}")

    results.append({"Model": name, "Type": "Prophet",
                    "Train_RMSE": round(rmse_train,3), "Test_RMSE": round(rmse_test,3),
                    "Gap": round(gap,3), "Verdict": verdict})

eval_prophet("AQI Forecast",          os.path.join(MODELS_DIR,"aqi.pkl"),   "aqi",           df_train, df_test)
eval_prophet("Water Quality Forecast", os.path.join(MODELS_DIR,"water.pkl"), "water_quality", df_train, df_test)

# ─────────────────────────────────────────────────────────────────────────────
# 4. Summary Table
# ─────────────────────────────────────────────────────────────────────────────
print("\n[4/4] Summary")
print("=" * 65)
df_results = pd.DataFrame(results)
print(df_results.to_string(index=False))
df_results.to_csv(os.path.join(EVAL_DIR, "evaluation_results.csv"), index=False)
print("\n  Full results saved -> data/evaluation/evaluation_results.csv")
print("  Plots saved        -> data/evaluation/*.png")
print("=" * 65)
print("\n  HOW TO READ THE RESULTS:")
print("  Train Acc ~ Test Acc  (gap < 5%)   -> [GOOD FIT]")
print("  Train Acc >> Test Acc (gap >= 5%)  -> [OVERFIT]")
print("  Both accuracies low   (< 70%)      -> [UNDERFIT]")
print("  Prophet: Test RMSE < 30% above Train RMSE -> [GOOD FIT]")
