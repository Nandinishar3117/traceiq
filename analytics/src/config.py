import os

class Settings:
    HOST: str = os.getenv("ANALYTICS_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("ANALYTICS_PORT", "8000"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    ANOMALY_ZSCORE_THRESHOLD: float = float(os.getenv("ANOMALY_ZSCORE_THRESHOLD", "2.0"))
    SLOW_REQUEST_THRESHOLD_MS: float = float(os.getenv("SLOW_REQUEST_THRESHOLD_MS", "800.0"))

settings = Settings()
