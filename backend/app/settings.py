from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str

    # JWT settings
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # This tells Pydantic where to find the .env file.
    # It constructs a path from this file's location (`app/`) up one level (`../`)
    # and then looks for a file named `.env`.
    model_config = SettingsConfigDict(env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))


# Create a single, reusable instance of the settings for the rest of the app
settings = Settings()