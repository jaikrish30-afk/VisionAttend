import os
from database import engine, Base

if os.path.exists("visionattend.db"):
    try:
        os.remove("visionattend.db")
        print("Removed SQLite file visionattend.db")
    except Exception as e:
        print("Could not delete file, dropping tables via SQLAlchemy:", e)

Base.metadata.create_all(bind=engine)
print("Database cleanly initialized with 0 preceded records!")
