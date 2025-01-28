# import sys
# import os
# from dotenv import load_dotenv
# import csv
# from openai import OpenAI
# from markdown import markdown

# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# # Function to convert CSV to multiline string
# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     if os.path.exists(csv_file_path):
#         with open(csv_file_path, newline='') as csvfile:
#             reader = csv.reader(csvfile)
#             for row in reader:
#                 multiline_string += ','.join(row) + "\n"
#     else:
#         # print(f"File {csv_file_path} not found, skipping.")
#         pass
#     return multiline_string

# # Get the file paths from command line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]
# api_surveys_csv = sys.argv[3]

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)
# sent_data_3 = csv_to_multiline_string(api_surveys_csv)

# # Combine available data
# combined_sent_data = sent_data_1 + sent_data_2 + sent_data_3

# # Only proceed if we have any data
# if combined_sent_data.strip():
#     response = client.chat.completions.create(
#         model="gpt-4o",
#     messages=[
#         {"role": "system", "content": "This is a PROM system summary. As a physician, review the patient's condition, focusing on changes. Separate positive and negative changes into their respective sections(make it bold tag). List each change on a new line without bullet points. Keep the response concise, accurate, and under 150 characters, ensuring clarity while retaining key points."},
#         {"role": "user", "content": combined_sent_data}
#     ],
#         max_tokens=100
#     )

#         # Convert the markdown response to rich text (HTML)
#     rich_text_response = markdown(response.choices[0].message.content)

#     # Print or return the rich text response
#     print(rich_text_response)

# else:
#     print("No data available to generate the AI message.")





# import sys
# import os
# from dotenv import load_dotenv
# import csv
# from openai import OpenAI
# from markdown import markdown

# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# # Function to convert CSV to multiline string
# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     if os.path.exists(csv_file_path):
#         with open(csv_file_path, newline='') as csvfile:
#             reader = csv.reader(csvfile)
#             for row in reader:
#                 multiline_string += ','.join(row) + "\n"
#     else:
#         # print(f"File {csv_file_path} not found, skipping.")
#         pass
#     return multiline_string

# # Get the file paths from command line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)

# # Combine available data
# combined_sent_data = sent_data_1 + sent_data_2

# # Only proceed if we have any data
# if combined_sent_data.strip():
#     response = client.chat.completions.create(
#         model="gpt-4o",
#         messages=[
#             {
#                 "role": "system",
#                 "content": (
#                     "This is a PROM system summary. As a physician, review the patient's condition, "
#                     "focusing on changes. Separate positive and negative changes into their respective "
#                     "sections (make it bold tag). List each change on a new line without bullet points. "
#                     "Keep the response concise, accurate, and under 150 characters, ensuring clarity "
#                     "while retaining key points."
#                 )
#             },
#             {"role": "user", "content": combined_sent_data}
#         ],
#         max_tokens=100
#     )

#     # Convert the markdown response to rich text (HTML)
#     rich_text_response = markdown(response.choices[0].message.content)

#     # Print or return the rich text response
#     print(rich_text_response)
# else:
#     print("No data available to generate the AI message.")






# import sys
# import os
# from dotenv import load_dotenv
# import csv
# from openai import OpenAI
# from markdown import markdown

# # Load environment variables
# load_dotenv()
# apikey = os.getenv('api_key')
# client = OpenAI(api_key=apikey)

# # Function to convert CSV to multiline string
# def csv_to_multiline_string(csv_file_path):
#     multiline_string = ""
#     if os.path.exists(csv_file_path):
#         with open(csv_file_path, newline='') as csvfile:
#             reader = csv.reader(csvfile)
#             for row in reader:
#                 multiline_string += ','.join(row) + "\n"
#     return multiline_string

# # Get the file paths from command line arguments
# severity_levels_csv = sys.argv[1]
# patient_health_scores_csv = sys.argv[2]

# # Convert CSV files to multiline strings
# sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)
# sent_data_2 = csv_to_multiline_string(severity_levels_csv)

# # Combine available data
# combined_sent_data = sent_data_1 + sent_data_2

# # Only proceed if we have any data
# if combined_sent_data.strip():
#     response = client.chat.completions.create(
#         model="gpt-4o",
#         messages=[
#             {
#                 "role": "system",
#                 "content": (
#                     "You are a PROM system assistant providing summaries for doctors. "
#                     "Analyze the patient's data to provide a concise, clear summary. "
#                     "Separate **positive changes** and **negative changes** into distinct sections. "
#                     "Under **Positive Changes**, highlight improvements, recovery, or stable metrics. "
#                     "Under **Negative Changes**, list declines, alarming trends, or worsening metrics. "
#                     "Each section should be labeled clearly, and each point must start on a new line. "
#                     "Use plain, formal language suitable for clinical documentation. "
#                     "Ensure the summary is accurate and free of any errors or ambiguities. "
#                     "Keep the tone neutral and professional, without exaggeration."
#                 )
#             },
#             {"role": "user", "content": combined_sent_data}
#         ],
#         max_tokens=150
#     )

#     # Convert the markdown response to rich text (HTML)
#     rich_text_response = markdown(response.choices[0].message.content)

#     # Print or return the rich text response
#     print(rich_text_response)
# else:
#     print("No data available to generate the AI message.")






import sys
import os
import csv
from dotenv import load_dotenv
from openai import OpenAI
from markdown import markdown

sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()
apikey = os.getenv('api_key')
client = OpenAI(api_key=apikey)

# Function to convert CSV to multiline string
def csv_to_multiline_string(csv_file_path):
    multiline_string = ""
    if os.path.exists(csv_file_path):
        with open(csv_file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            for row in reader:
                multiline_string += ','.join(row) + "\n"
    return multiline_string

# Get the file paths from command line arguments
severity_levels_csv = sys.argv[1]
patient_health_scores_csv = sys.argv[2]

# 1) Collect the titles that the patient actually answered
answered_titles = set()
with open(patient_health_scores_csv, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        answered_titles.add(row.get('title', '').strip())

# 2) Filter the severity levels to only include rows matching patient-answered titles
filtered_severity_rows = []
with open(severity_levels_csv, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        if row.get('Scale', '').strip() in answered_titles:
            filtered_severity_rows.append(row)

# 3) Convert the patient's CSV to a multiline string
sent_data_1 = csv_to_multiline_string(patient_health_scores_csv)

# 4) Convert the filtered severity rows to multiline string
sent_data_2 = ""
for row in filtered_severity_rows:
    sent_data_2 += ",".join(row.values()) + "\n"

# 5) Combine them (only includes answered surveys)
combined_sent_data = sent_data_1 + sent_data_2

# Only proceed if we have any data
if combined_sent_data.strip():
    try:
        # Generate English Summary
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a PROM system assistant providing summaries for doctors. "
                        "Analyze the patient's data to provide a concise, clear summary. "
                        "Separate **positive changes** and **negative changes** into distinct sections. "
                        "Under **Positive Changes**, highlight improvements, recovery, or stable metrics. "
                        "Under **Negative Changes**, list declines, alarming trends, or worsening metrics. "
                        "Each section should be labeled clearly, and each point must start on a new line. "
                        "Use plain, formal language suitable for clinical documentation. "
                        "Ensure the summary is accurate and free of any errors or ambiguities. "
                        "Keep the tone neutral and professional, without exaggeration."
                    )
                },
                {"role": "user", "content": combined_sent_data}
            ],
            max_tokens=150
        )

        english_summary = response.choices[0].message.content
        rich_text_response = markdown(english_summary)
        print("===ENGLISH_SUMMARY_START===")
        print(rich_text_response)
        print("===ENGLISH_SUMMARY_END===")

        # Generate Arabic Translation
        translation_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional medical translator. "
                        "Provide an accurate Arabic translation of the summary, "
                        "keeping the same structure, bullet points, and formal tone."
                    )
                },
                {"role": "user", "content": english_summary}
            ],
            max_tokens=300
        )

        arabic_translation = translation_response.choices[0].message.content
        arabic_text_response = markdown(arabic_translation)
        print("===ARABIC_SUMMARY_START===")
        print(arabic_text_response.encode('utf-8').decode('utf-8'))
        print("===ARABIC_SUMMARY_END===")

    except Exception as e:
        print(f"An error occurred while communicating with OpenAI: {e}")
else:
    print("No data available to generate the AI message.")
