import asyncio
import pandas as pd
from sqlalchemy import text
# Adjust these imports based on your exact file structure
from app.core.database import SessionLocal 
from app.models.document import MedicalDocument 

async def import_massive_dataset():
    file_path = "app/data/uploads/master_medical_library.parquet"
    
    print(f"📂 Loading {file_path} into memory...")
    try:
        df = pd.read_parquet(file_path)
    except FileNotFoundError:
        print("❌ File not found. Make sure you downloaded it from AI Kosha to the uploads folder!")
        return

    total_rows = len(df)
    print(f"📊 Found {total_rows} rows to import.")

    async with SessionLocal() as session:
        # 1. THE CLEAN WIPE: Delete old partial batches to prevent duplicates
        print("🧹 Wiping old partial data and resetting IDs...")
        await session.execute(text("TRUNCATE TABLE medical_documents RESTART IDENTITY;"))
        await session.commit()

        # 2. BULK INSERT: Process in massive chunks of 5000 for maximum speed
        batch_size = 5000
        print(f"🚀 Starting bulk import in batches of {batch_size}...")

        for i in range(0, total_rows, batch_size):
            batch_df = df.iloc[i:i+batch_size]
            
            # Convert dataframe rows to SQLAlchemy model objects
            documents = [
                MedicalDocument(
                    content=row['combined_text'],
                    embedding=row['embedding']
                )
                for _, row in batch_df.iterrows()
            ]
            
            session.add_all(documents)
            await session.commit()
            
            print(f"✅ Saved batch {i} to {i + len(batch_df)} / {total_rows}")

        print("🎉 Massive Medical Library successfully imported to PostgreSQL!")

if __name__ == "__main__":
    # Windows asyncio fix
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(import_massive_dataset())