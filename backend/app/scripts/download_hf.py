import os
import pandas as pd
from datasets import load_dataset

def download_medical_dataset():
    # Ensure the upload directory exists
    os.makedirs("app/data/uploads", exist_ok=True)
    
    print("Downloading 'FreedomIntelligence/medical-o1-reasoning-SFT' (English subset)...")
    print("This might take a few minutes depending on your internet connection...")
    
    # Added "en" here to specify the English configuration
    dataset = load_dataset("FreedomIntelligence/medical-o1-reasoning-SFT", "en", split="train")
    
    print("Converting dataset to a tabular DataFrame...")
    df = pd.DataFrame(dataset)
    
    # Save path
    save_path = "app/data/uploads/medical_o1_reasoning.csv"
    
    print(f"Saving massive CSV to: {save_path}")
    df.to_csv(save_path, index=False)
    
    print("✅ Download complete! Your CSV is ready for ingestion.")

if __name__ == "__main__":
    download_medical_dataset()