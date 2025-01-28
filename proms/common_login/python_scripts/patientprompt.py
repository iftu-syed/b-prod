# import sys
# import os
# import csv
# import json
# from dotenv import load_dotenv
# from openai import OpenAI

# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     with open(csv_file_path, newline='') as csvfile:
#         reader = csv.reader(csvfile)
#         for row in reader:
#             multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get the file paths from command line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]
# api_surveys_csv = sys.argv[3]

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)
# sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# # Combine into one large string
# combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# # 1) Generate the summary in English
# summary_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": (
#                 "This is a PROMS system. Act like a human and act like you're speaking to "
#                 "the patient directly. Tell the overall condition summary of the patient in "
#                 "layman's terms. Give a short (30-40 words) and motivating output."
#             ),
#         },
#         {"role": "user", "content": combined_sent_data},
#     ],
#     max_tokens=100,
# )

# english_summary = summary_response.choices[0].message.content.strip()

# # 2) Get the Arabic translation of the English summary
# translation_response = client.chat.completions.create(
#     model="gpt-4o",
#     messages=[
#         {
#             "role": "system",
#             "content": "You are a translator. Please translate the following text into Arabic."
#         },
#         {
#             "role": "user",
#             "content": english_summary
#         },
#     ],
#     max_tokens=150,
# )

# arabic_translation = translation_response.choices[0].message.content.strip()

# # Create a JSON object with both messages
# output_data = {
#     "english_summary": english_summary,
#     "arabic_translation": arabic_translation
# }

# # Print the JSON so Node.js can parse it easily
# print(json.dumps(output_data))



import sys
import os
import csv
import json
from dotenv import load_dotenv
from openai import OpenAI
from textblob import TextBlob

# Load environment variables
load_dotenv()
apikey = os.getenv('api_key')
client = OpenAI(api_key=apikey)

# Function to parse patient health scores from CSV
def parse_health_scores(csv_file_path):
    health_scores = {}
    with open(csv_file_path, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if "title" in row and "score" in row:
                health_scores[row["title"]] = float(row["score"])
    return health_scores

# Function to convert CSV to multiline string
def csv_to_multiline_string(csv_file_path):
    multiline_string = ""
    with open(csv_file_path, newline='') as csvfile:
        reader = csv.reader(csvfile)
        for row in reader:
            multiline_string += ','.join(row) + "\n"
    return multiline_string

# Get file paths from command-line arguments
severity_levels_csv = sys.argv[1]
patient_health_scores_csv = sys.argv[2]
api_surveys_csv = sys.argv[3]

# Parse health scores and identify if health is poor
health_scores = parse_health_scores(patient_health_scores_csv)
poor_health = any(score < 30 for score in health_scores.values())  # Threshold for poor health

# Collect the titles that the patient actually answered
answered_titles = set(health_scores.keys())

# Filter the severity-levels CSV rows to only keep those matching the patient-answered titles
filtered_severity_rows = []
with open(severity_levels_csv, newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        if row.get('Scale', '').strip() in answered_titles:
            filtered_severity_rows.append(row)

# Convert the patient CSV to multiline string
sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)

# Convert filtered severity rows to multiline string
sent_data_2 = ""
for row in filtered_severity_rows:
    sent_data_2 += ",".join(row.values()) + "\n"

# Convert the API surveys CSV to multiline string
sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# Combine all data into a single string
combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# Step 1: Generate English summary with an enhanced prompt
summary_response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": (
                "You are a PROMIS system that provides human-like summaries of a patient's health status "
                "based on their physical and mental health data. Your summary must be empathetic, motivational, "
                "and tailored to the patient's condition. Use plain language so the patient can easily understand "
                "the overall health trends. Ensure the summary is at least 20 words."
            ),
        },
        {"role": "user", "content": combined_sent_data},
    ],
    max_tokens=400,  # Allow enough space for ~100+ words
)

english_summary = summary_response.choices[0].message.content.strip()

# Step 2: Perform sentiment analysis on the English summary
blob = TextBlob(english_summary)
sentiment_score = blob.sentiment.polarity  # Range: -1 (negative) to 1 (positive)

# Step 3: Append helpful link if sentiment indicates a decline in health or poor health scores
if sentiment_score < 0 or poor_health:  # Either negative sentiment or poor health scores
    english_summary += "\n\nFor additional help, please visit: https://wehealthify.org/"

# Step 4: Translate the English summary into Arabic
translation_response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "You are a translator. Translate the following text into Arabic."
        },
        {
            "role": "user",
            "content": english_summary
        },
    ],
    max_tokens=400,
)

arabic_translation = translation_response.choices[0].message.content.strip()

# Step 5: Create the output JSON object
output_data = {
    "english_summary": english_summary,
    "arabic_translation": arabic_translation
}

# Step 6: Print JSON for Node.js to parse
print(json.dumps(output_data))
