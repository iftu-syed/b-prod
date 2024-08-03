import pymongo
import pandas as pd
import sys
from datetime import datetime

# MongoDB connection
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["Data_Entry_Incoming"]
collection = db["patient_data"]

# Function to extract and process data
def process_data(record, mr_no):
    rows = []
    trace_name = None
    if "FORM_ID" in record:
        for form_id, form_data in record["FORM_ID"].items():
            assessments = form_data["assessments"]
            if not assessments:
                continue

            for idx, assessment in enumerate(assessments):
                date = assessment["timestamp"]
                months_since_baseline = idx + 1  # Use index to represent months_since_baseline count
                score = assessment["scoreDetails"]["T-Score"]
                trace_name = assessment["scoreDetails"]["Name"]  # Capture the trace_name
                title = assessment["scoreDetails"]["Name"]

                row = {
                    "date": date.strftime("%Y-%m-%d"),
                    "months_since_baseline": months_since_baseline,
                    "score": score,
                    "trace_name": trace_name,
                    "mr_no": mr_no,
                    "title": title,
                    "ymin": 20,
                    "ymax": 80
                }
                rows.append(row)

    return rows, trace_name

# Get the mr_no from command-line arguments
if len(sys.argv) < 2:
    print("Please provide the Mr_no as a command-line argument.")
    sys.exit(1)

mr_no = sys.argv[1]

# Extract data for the specific Mr_no
all_records = collection.find({"Mr_no": mr_no})
all_data = []
trace_name = None

for record in all_records:
    data, trace_name = process_data(record, mr_no)
    all_data.extend(data)

# Create DataFrame and save to CSV
df = pd.DataFrame(all_data)
if trace_name:
    csv_filename = f"data/API_SURVEYS_{mr_no}.csv"
else:
    csv_filename = f"{mr_no}.csv"

df.to_csv(csv_filename, index=False)

print(f"CSV file generated successfully: {csv_filename}")
