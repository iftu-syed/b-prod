import sys
import os
from dotenv import load_dotenv
import csv
from openai import OpenAI
from markdown import markdown

load_dotenv()
apikey = os.getenv('api_key')
client = OpenAI(api_key=apikey)

# Function to convert CSV to multiline string
def csv_to_multiline_string(csv_file_path):
    multiline_string = ""
    if os.path.exists(csv_file_path):
        with open(csv_file_path, newline='') as csvfile:
            reader = csv.reader(csvfile)
            for row in reader:
                multiline_string += ','.join(row) + "\n"
    else:
        # print(f"File {csv_file_path} not found, skipping.")
        pass
    return multiline_string

# Get the file paths from command line arguments
severity_levels_csv = sys.argv[1]
patient_health_scores_csv = sys.argv[2]
api_surveys_csv = sys.argv[3]

# Convert CSV files to multiline strings
sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
sent_data_2 = csv_to_multiline_string(severity_levels_csv)
sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# Combine available data
combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# Only proceed if we have any data
if combined_sent_data.strip():
    response = client.chat.completions.create(
        model="gpt-4o",
    messages=[
        {"role": "system", "content": "This is a PROM system summary. As a physician, review the patient's condition, focusing on changes. Separate positive and negative changes into their respective sections(make it bold tag). List each change on a new line without bullet points. Keep the response concise, accurate, and under 150 characters, ensuring clarity while retaining key points."},
        {"role": "user", "content": combined_sent_data}
    ],
        max_tokens=100
    )

        # Convert the markdown response to rich text (HTML)
    rich_text_response = markdown(response.choices[0].message.content)

    # Print or return the rich text response
    print(rich_text_response)

else:
    print("No data available to generate the AI message.")
