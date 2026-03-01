"""
Model Retraining Scheduler
============================
Runs a background job to retrain all ML models using fresh
real-world data fetched from Open-Meteo APIs.

Schedule: Every Sunday at 02:00 (weekly, off-peak).

Usage:
  python scheduler.py
  (Or let it run as a background process / Docker sidecar)
"""

import logging
import subprocess
import sys
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart_city_ml.scheduler")

def retrain_models():
    logger.info("🔄 Starting scheduled model retraining...")
    try:
        result = subprocess.run(
            [sys.executable, "train_models.py"],
            capture_output=True, text=True, timeout=600
        )
        if result.returncode == 0:
            logger.info("✅ Models retrained successfully.")
            logger.info(result.stdout[-500:])
        else:
            logger.error(f"❌ Retraining failed:\n{result.stderr[-500:]}")
    except subprocess.TimeoutExpired:
        logger.error("❌ Retraining timed out (> 10 minutes).")
    except Exception as e:
        logger.error(f"❌ Unexpected error during retraining: {e}")

if __name__ == "__main__":
    scheduler = BackgroundScheduler()
    
    # Every Sunday at 02:00 AM
    scheduler.add_job(retrain_models, CronTrigger(day_of_week="sun", hour=2, minute=0))
    scheduler.start()
    
    logger.info("✅ Scheduler started. Models will retrain every Sunday at 02:00 AM.")
    logger.info("   Press Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("Scheduler stopped.")
