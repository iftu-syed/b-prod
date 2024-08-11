import sys
import os
from dotenv import load_dotenv
import csv
from openai import OpenAI

load_dotenv()
apikey = os.getenv('api_key')
client = OpenAI(api_key=apikey)


# Your existing code...


def csv_to_multiline_string(csv_file_path):
    multiline_string = ""
    with open(csv_file_path, newline='') as csvfile:
        reader = csv.reader(csvfile)
        for row in reader:
            multiline_string += ','.join(row) + "\n"
    return multiline_string

# Get the file paths from command line arguments
severity_levels_csv = sys.argv[1]
patient_health_scores_csv = sys.argv[2]
api_surveys_csv = sys.argv[3]

# Convert CSV files to multiline strings
sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
sent_data_2 = csv_to_multiline_string(severity_levels_csv)
sent_data_3 = csv_to_multiline_string(api_surveys_csv)

combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "This is a PROMS system. Act like a human and act like you're speaking to the patient directly. Tell the overall condition summary of the patient in layman's terms. Give a short (30-40 words) and motivating output."},
        {"role": "user", "content": combined_sent_data}
    ],
    max_tokens=100
)

print(response.choices[0].message.content)
