

# import pymongo
# from datetime import datetime
# import plotly.graph_objs as go
# from collections import defaultdict
# import os

# # Connect to MongoDB
# client = pymongo.MongoClient("mongodb://localhost:27017/")  # Update with your MongoDB connection string
# db = client["Data_Entry_Incoming"]
# collection = db["patient_data"]

# # Function to fetch survey responses based on Mr_no and survey type
# def fetch_survey_responses(mr_no, survey_type):
#     survey_responses = []
#     cursor = collection.find({"Mr_no": mr_no})
#     for response in cursor:
#         if survey_type in response:
#             survey_responses.extend(response[survey_type].values())
#     return survey_responses

# # Function to recode scores as per PROMIS v1.2
# def recode_promis_scores(response):
#     recoded_response = {}
#     for key, value in response.items():
#         try:
#             if key == 'Global07':
#                 value = int(value)
#                 if value == 0:
#                     recoded_response[key + 'r'] = 5
#                 elif 1 <= value <= 3:
#                     recoded_response[key + 'r'] = 4
#                 elif 4 <= value <= 6:
#                     recoded_response[key + 'r'] = 3
#                 elif 7 <= value <= 9:
#                     recoded_response[key + 'r'] = 2
#                 elif value == 10:
#                     recoded_response[key + 'r'] = 1
#             elif key == 'Global08':
#                 value = int(value)
#                 recoded_response[key + 'r'] = 6 - value
#             elif key == 'Global10':
#                 value = int(value)
#                 recoded_response[key + 'r'] = 6 - value
#             else:
#                 recoded_response[key] = int(value)
#         except ValueError:
#             # Skip non-integer values like timestamps
#             continue
#     return recoded_response

# # Function to aggregate scores for each date
# def aggregate_scores_by_date(survey_responses):
#     scores_by_date = defaultdict(int)
#     date_responses = defaultdict(list)
#     for response in survey_responses:
#         recoded_response = recode_promis_scores(response)
#         timestamp = response.get('timestamp')
#         date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
#         scores_by_date[date] += sum(value for key, value in recoded_response.items() if key != 'Mr_no' and key != 'timestamp')
#         date_responses[date].append(recoded_response)
#     return scores_by_date, date_responses

# # Function to fetch patient name based on Mr_no
# def fetch_patient_name(mr_no):
#     patient_data = collection.find_one({"Mr_no": mr_no}, {"Name": 1})
#     if patient_data:
#         return patient_data.get("Name")
#     else:
#         return "Unknown"

# # Function to fetch patient events based on Mr_no
# def fetch_patient_events(mr_no):
#     patient_data = collection.find_one({"Mr_no": mr_no}, {"Events": 1})
#     if patient_data and "Events" in patient_data:
#         return patient_data["Events"]
#     else:
#         return []

# # Function to create hover text for each point
# def create_hover_text(date_responses):
#     hover_texts = []
#     for date, responses in date_responses.items():
#         hover_text = f"<b>Date:</b> {date}<br><br>"
#         for response in responses:
#             hover_text += "<b>Response:</b><br>{}<br>".format("<br>".join([f"{key}: {value}" for key, value in response.items() if key != 'Mr_no' and key != 'timestamp']))
#         hover_texts.append(hover_text)
#     return hover_texts

# # Function to create gradient background shapes
# def create_gradient_shapes(max_score, safe_limit, survey_type):
#     gradient_steps = 100
#     shapes = []

#     if survey_type == 'PROMIS-10':
#         # For PROMIS-10, lower scores are worse
#         for i in range(gradient_steps):
#             shapes.append({
#                 "type": "rect",
#                 "xref": "paper",
#                 "yref": "y",
#                 "x0": 0,
#                 "x1": 1,
#                 "y0": i * max_score / gradient_steps,
#                 "y1": (i + 1) * max_score / gradient_steps,
#                 "fillcolor": f"rgba(255, 0, 0, {0.2 * (1 - i / gradient_steps)})",
#                 "layer": "below",
#                 "line": {"width": 0}
#             })
#             shapes.append({
#                 "type": "rect",
#                 "xref": "paper",
#                 "yref": "y",
#                 "x0": 0,
#                 "x1": 1,
#                 "y0": safe_limit + i * (max_score - safe_limit) / gradient_steps,
#                 "y1": safe_limit + (i + 1) * (max_score - safe_limit) / gradient_steps,
#                 "fillcolor": f"rgba(0, 255, 0, {0.2 * (i / gradient_steps)})",
#                 "layer": "below",
#                 "line": {"width": 0}
#             })
#     else:
#         # For other surveys, higher scores are worse
#         for i in range(gradient_steps):
#             shapes.append({
#                 "type": "rect",
#                 "xref": "paper",
#                 "yref": "y",
#                 "x0": 0,
#                 "x1": 1,
#                 "y0": i * safe_limit / gradient_steps,
#                 "y1": (i + 1) * safe_limit / gradient_steps,
#                 "fillcolor": f"rgba(0, 255, 0, {0.2 * (1 - i / gradient_steps)})",
#                 "layer": "below",
#                 "line": {"width": 0}
#             })
#             shapes.append({
#                 "type": "rect",
#                 "xref": "paper",
#                 "yref": "y",
#                 "x0": 0,
#                 "x1": 1,
#                 "y0": safe_limit + i * (max_score - safe_limit) / gradient_steps,
#                 "y1": safe_limit + (i + 1) * (max_score - safe_limit) / gradient_steps,
#                 "fillcolor": f"rgba(255, 0, 0, {0.2 * (i / gradient_steps)})",
#                 "layer": "below",
#                 "line": {"width": 0}
#             })

#     return shapes

# # Function to create annotations for labels
# def create_label_annotations(max_score, safe_limit, survey_type):
#     if survey_type == 'PROMIS-10':
#         return [
#             dict(
#                 xref="paper",
#                 yref="y",
#                 x=0.5,
#                 y=safe_limit / 4,
#                 text="severe",
#                 showarrow=False,
#                 font=dict(size=14, color="black")
#             ),
#             dict(
#                 xref="paper",
#                 yref="y",
#                 x=0.5,
#                 y=safe_limit * 0.75,
#                 text="moderate",
#                 showarrow=False,
#                 font=dict(size=14, color="black")
#             ),
#             dict(
#                 xref="paper",
#                 yref="y",
#                 x=0.5,
#                 y=safe_limit + (max_score - safe_limit) / 2,
#                 text="mild",
#                 showarrow=False,
#                 font=dict(size=14, color="black")
#             )
#         ]
#     else:
#         return [
#             dict(
#                 xref="paper",
#                 yref="y",
#                 x=0.5,
#                 y=safe_limit / 4,
#                 text="mild",
#                 showarrow=False,
#                 font=dict(size=14, color="black")
#             ),
#             dict(
#                 xref="paper",
#                 yref="y",
#                 x=0.5,
#                 y=safe_limit * 0.75,
#                 text="moderate",
#                 showarrow=False,
#                 font=dict(size=14, color="black")
#             ),
#             dict(
#                 xref="paper",
#                 yref="y",
#                 x=0.5,
#                 y=safe_limit + (max_score - safe_limit) / 2,
#                 text="severe",
#                 showarrow=False,
#                 font=dict(size=14, color="black")
#             )
#         ]

# # Function to get the threshold for different survey types
# def get_threshold(survey_type):
#     thresholds = {
#         'EPDS': 12,
#         'PROMIS-10': 50,  # Update threshold for PROMIS-10
#         'ICIQ-UI_SF': 10,
#         'PAID': 8,
#         'Wexner': 15,
#         'PBQ': 25,
#         # Add other survey types and their thresholds here
#     }
#     return thresholds.get(survey_type, 10)  # Default threshold is 10

# # Function to generate the graph
# def graph_generate(mr_no, survey_type):
#     # Fetch patient name
#     patient_name = fetch_patient_name(mr_no)
    
#     # Fetch survey responses and aggregate scores by date
#     survey_responses = fetch_survey_responses(mr_no, survey_type)
    
#     # Debugging output to check if responses are fetched correctly
#     print(f"Survey responses for {survey_type}: {survey_responses}")
    
#     scores_by_date, date_responses = aggregate_scores_by_date(survey_responses)

#     # Create traces for the survey type
#     all_dates = sorted(scores_by_date.keys())
#     scores = [scores_by_date[date] for date in all_dates]
#     hover_text = create_hover_text(date_responses)

#     # Debugging output to check the scores and dates
#     print(f"All dates: {all_dates}")
#     print(f"Scores: {scores}")

#     if not scores:
#         print(f"No data found for survey type {survey_type}")
#         return

#     # Calculate months since initial date
#     initial_date = datetime.strptime(all_dates[0], "%Y-%m-%d")
#     months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in all_dates]

#     # Create trace for the line plot
#     trace = go.Scatter(x=months_since_initial, y=scores, name=survey_type, mode='lines+markers',
#                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
#                        line=dict(width=2),
#                        marker=dict(size=8))

#     # Get the threshold for the survey type
#     safe_limit = get_threshold(survey_type)

#     # Create layout
#     max_score = max(scores) + 5
#     layout = {
#         "title": f'Mr_no : {mr_no} | Name : {patient_name} | Survey Type : {survey_type}',
#         "xaxis": dict(
#             title='Timeline (Months)',
#             tickvals=list(range(1, 13)),
#             ticktext=["Baseline" if i == 1 else f"{i} month{'s' if i > 1 else ''}" for i in range(1, 13)]
#         ),
#         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(0,0,0,0)',
#         "hovermode": 'closest',
#         "legend": {
#             "x": 0.02,
#             "y": 0.98,
#             "bgcolor": 'rgba(255,255,255,0.5)',
#             "bordercolor": 'rgba(0,0,0,0.5)',
#             "borderwidth": 2
#         },
#         "shapes": create_gradient_shapes(max_score, safe_limit, survey_type),
#         "annotations": create_label_annotations(max_score, safe_limit, survey_type)
#     }

#     # Fetch patient events
#     patient_events = fetch_patient_events(mr_no)
    
#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
#         months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
#         annotation_x = months_since_initial_event  # Event date in months since initial date
#         annotation_y = max_score - 5  # Adjust y-coordinate for annotation text

#         # Add annotation for the event
#         annotations.append(
#             dict(
#                 x=annotation_x,
#                 y=annotation_y,
#                 xref="x",
#                 yref="y",
#                 text=event["event"],
#                 showarrow=True,
#                 arrowhead=7,
#                 ax=0,
#                 ay=-40
#             )
#         )

#         # Add vertical line for the event date
#         layout["shapes"].append({
#             "type": "line",
#             "x0": annotation_x,
#             "y0": 0,
#             "x1": annotation_x,
#             "y1": max_score,
#             "line": {"color": "black", "width": 1, "dash": "dash"}
#         })

#     layout["annotations"].extend(annotations)

#     # Create figure
#     fig = go.Figure(data=[trace], layout=layout)
    
#     # Update axes
#     fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
#     fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

#     # Update figure layout
#     fig.update_layout(
#         autosize=True,
#         title=dict(font=dict(size=16, color='#333'), x=0.5),
#         margin=dict(l=40, r=40, b=40, t=60),
#         hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
#         legend_title=dict(font=dict(size=12, color='#333')),
#     )

#     # Ensure the directory exists
#     output_dir = 'new_folder1'
#     os.makedirs(output_dir, exist_ok=True)

#     # Save the plot to an HTML file
#     output_file = os.path.join(output_dir, f'{survey_type}.html')
#     fig.write_html(output_file)

#     # Show the plot
#     # fig.show()

# # Get the Mr_no and survey_type from command-line arguments
# import sys

# try:
#     mr_no = str(sys.argv[1])
#     survey_type = str(sys.argv[2])
# except IndexError:
#     print("No input value provided.")
#     sys.exit(1)
# except ValueError:
#     print("Invalid input value. Please provide valid Mr_no and survey_type.")
#     sys.exit(1)

# # Call the function with the input values and show the graph
# graph_generate(mr_no, survey_type)



import pymongo
from datetime import datetime
import plotly.graph_objs as go
from collections import defaultdict
import os
import sys

# Connect to MongoDB
client = pymongo.MongoClient("mongodb://localhost:27017/")  # Update with your MongoDB connection string
db = client["Data_Entry_Incoming"]
collection = db["patient_data"]

# Function to fetch survey responses based on Mr_no and survey type
def fetch_survey_responses(mr_no, survey_type):
    survey_responses = []
    cursor = collection.find({"Mr_no": mr_no})
    for response in cursor:
        if survey_type in response:
            survey_responses.extend(response[survey_type].values())
    return survey_responses

# Function to recode scores as per PROMIS v1.2
def recode_promis_scores(response):
    recoded_response = {}
    for key, value in response.items():
        try:
            if key == 'Global07':
                value = int(value)
                if value == 0:
                    recoded_response[key + 'r'] = 5
                elif 1 <= value <= 3:
                    recoded_response[key + 'r'] = 4
                elif 4 <= value <= 6:
                    recoded_response[key + 'r'] = 3
                elif 7 <= value <= 9:
                    recoded_response[key + 'r'] = 2
                elif value == 10:
                    recoded_response[key + 'r'] = 1
            elif key == 'Global08':
                value = int(value)
                recoded_response[key + 'r'] = 6 - value
            elif key == 'Global10':
                value = int(value)
                recoded_response[key + 'r'] = 6 - value
            else:
                recoded_response[key] = int(value)
        except ValueError:
            # Skip non-integer values like timestamps
            continue
    return recoded_response

# Function to aggregate scores for each date
def aggregate_scores_by_date(survey_responses):
    scores_by_date = defaultdict(int)
    date_responses = defaultdict(list)
    for response in survey_responses:
        recoded_response = recode_promis_scores(response)
        timestamp = response.get('timestamp')
        date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
        scores_by_date[date] += sum(value for key, value in recoded_response.items() if key != 'Mr_no' and key != 'timestamp')
        date_responses[date].append(recoded_response)
    return scores_by_date, date_responses

# Function to fetch patient name based on Mr_no
def fetch_patient_name(mr_no):
    patient_data = collection.find_one({"Mr_no": mr_no}, {"Name": 1})
    if patient_data:
        return patient_data.get("Name")
    else:
        return "Unknown"

# Function to fetch patient events based on Mr_no
def fetch_patient_events(mr_no):
    patient_data = collection.find_one({"Mr_no": mr_no}, {"Events": 1})
    if patient_data and "Events" in patient_data:
        return patient_data["Events"]
    else:
        return []

# Function to create hover text for each point
def create_hover_text(date_responses):
    hover_texts = []
    for date, responses in date_responses.items():
        hover_text = f"<b>Date:</b> {date}<br><br>"
        for response in responses:
            hover_text += "<b>Response:</b><br>{}<br>".format("<br>".join([f"{key}: {value}" for key, value in response.items() if key != 'Mr_no' and key != 'timestamp']))
        hover_texts.append(hover_text)
    return hover_texts

# Function to create gradient background shapes
def create_gradient_shapes(max_score, safe_limit, survey_type):
    gradient_steps = 100
    shapes = []

    if survey_type == 'PROMIS-10':
        # For PROMIS-10, lower scores are worse
        for i in range(gradient_steps):
            shapes.append({
                "type": "rect",
                "xref": "paper",
                "yref": "y",
                "x0": 0,
                "x1": 1,
                "y0": i * max_score / gradient_steps,
                "y1": (i + 1) * max_score / gradient_steps,
                "fillcolor": f"rgba(255, 0, 0, {0.2 * (1 - i / gradient_steps)})",
                "layer": "below",
                "line": {"width": 0}
            })
            shapes.append({
                "type": "rect",
                "xref": "paper",
                "yref": "y",
                "x0": 0,
                "x1": 1,
                "y0": safe_limit + i * (max_score - safe_limit) / gradient_steps,
                "y1": safe_limit + (i + 1) * (max_score - safe_limit) / gradient_steps,
                "fillcolor": f"rgba(0, 255, 0, {0.2 * (i / gradient_steps)})",
                "layer": "below",
                "line": {"width": 0}
            })
    else:
        # For other surveys, higher scores are worse
        for i in range(gradient_steps):
            shapes.append({
                "type": "rect",
                "xref": "paper",
                "yref": "y",
                "x0": 0,
                "x1": 1,
                "y0": i * safe_limit / gradient_steps,
                "y1": (i + 1) * safe_limit / gradient_steps,
                "fillcolor": f"rgba(0, 255, 0, {0.2 * (1 - i / gradient_steps)})",
                "layer": "below",
                "line": {"width": 0}
            })
            shapes.append({
                "type": "rect",
                "xref": "paper",
                "yref": "y",
                "x0": 0,
                "x1": 1,
                "y0": safe_limit + i * (max_score - safe_limit) / gradient_steps,
                "y1": safe_limit + (i + 1) * (max_score - safe_limit) / gradient_steps,
                "fillcolor": f"rgba(255, 0, 0, {0.2 * (i / gradient_steps)})",
                "layer": "below",
                "line": {"width": 0}
            })

    return shapes

# Function to create annotations for labels
def create_label_annotations(max_score, safe_limit, survey_type):
    if survey_type == 'PROMIS-10':
        return [
            dict(
                xref="paper",
                yref="y",
                x=0.5,
                y=safe_limit / 4,
                text="severe",
                showarrow=False,
                font=dict(size=14, color="black")
            ),
            dict(
                xref="paper",
                yref="y",
                x=0.5,
                y=safe_limit * 0.75,
                text="moderate",
                showarrow=False,
                font=dict(size=14, color="black")
            ),
            dict(
                xref="paper",
                yref="y",
                x=0.5,
                y=safe_limit + (max_score - safe_limit) / 2,
                text="mild",
                showarrow=False,
                font=dict(size=14, color="black")
            )
        ]
    else:
        return [
            dict(
                xref="paper",
                yref="y",
                x=0.5,
                y=safe_limit / 4,
                text="mild",
                showarrow=False,
                font=dict(size=14, color="black")
            ),
            dict(
                xref="paper",
                yref="y",
                x=0.5,
                y=safe_limit * 0.75,
                text="moderate",
                showarrow=False,
                font=dict(size=14, color="black")
            ),
            dict(
                xref="paper",
                yref="y",
                x=0.5,
                y=safe_limit + (max_score - safe_limit) / 2,
                text="severe",
                showarrow=False,
                font=dict(size=14, color="black")
            )
        ]

# Function to get the threshold for different survey types
def get_threshold(survey_type):
    thresholds = {
        'EPDS': 12,
        'PROMIS-10': 50,  # Update threshold for PROMIS-10
        'ICIQ-UI_SF': 10,
        'PAID': 8,
        'Wexner': 15,
        'PBQ': 25,
        # Add other survey types and their thresholds here
    }
    return thresholds.get(survey_type, 10)  # Default threshold is 10

# Function to generate the graph
def graph_generate(mr_no, survey_type):
    # Fetch patient name
    patient_name = fetch_patient_name(mr_no)
    
    # Fetch survey responses and aggregate scores by date
    survey_responses = fetch_survey_responses(mr_no, survey_type)
    
    # Debugging output to check if responses are fetched correctly
    print(f"Survey responses for {survey_type}: {survey_responses}")
    
    scores_by_date, date_responses = aggregate_scores_by_date(survey_responses)

    # Create traces for the survey type
    all_dates = sorted(scores_by_date.keys())
    scores = [scores_by_date[date] for date in all_dates]
    hover_text = create_hover_text(date_responses)

    # Debugging output to check the scores and dates
    print(f"All dates: {all_dates}")
    print(f"Scores: {scores}")

    if not scores:
        print(f"No data found for survey type {survey_type}")
        return

    # Calculate months since initial date
    initial_date = datetime.strptime(all_dates[0], "%Y-%m-%d")
    months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in all_dates]

    # Create trace for the line plot
    trace = go.Scatter(x=months_since_initial, y=scores, name=survey_type, mode='lines+markers',
                       hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
                       line=dict(width=2),
                       marker=dict(size=8))

    # Get the threshold for the survey type
    safe_limit = get_threshold(survey_type)

    # Create layout
    max_score = max(scores) + 5
    layout = {
        "title": f'Mr_no : {mr_no} | Name : {patient_name} | Survey Type : {survey_type}',
        "xaxis": dict(
            title='Timeline (Months)',
            tickvals=list(range(1, 13)),
            ticktext=["Baseline" if i == 1 else f"{i} month{'s' if i > 1 else ''}" for i in range(1, 13)]
        ),
        "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
        "plot_bgcolor": 'rgba(0,0,0,0)',
        "paper_bgcolor": 'rgba(0,0,0,0)',
        "hovermode": 'closest',
        "legend": {
            "x": 0.02,
            "y": 0.98,
            "bgcolor": 'rgba(255,255,255,0.5)',
            "bordercolor": 'rgba(0,0,0,0.5)',
            "borderwidth": 2
        },
        "shapes": create_gradient_shapes(max_score, safe_limit, survey_type),
        "annotations": create_label_annotations(max_score, safe_limit, survey_type)
    }

    # Fetch patient events
    patient_events = fetch_patient_events(mr_no)
    
    annotations = []
    for event in patient_events:
        event_date = event["date"]
        annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
        months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
        annotation_x = months_since_initial_event  # Event date in months since initial date
        annotation_y = max_score - 5  # Adjust y-coordinate for annotation text

        # Add annotation for the event
        annotations.append(
            dict(
                x=annotation_x,
                y=annotation_y,
                xref="x",
                yref="y",
                text=event["event"],
                showarrow=True,
                arrowhead=7,
                ax=0,
                ay=-40
            )
        )

        # Add vertical line for the event date
        layout["shapes"].append({
            "type": "line",
            "x0": annotation_x,
            "y0": 0,
            "x1": annotation_x,
            "y1": max_score,
            "line": {"color": "black", "width": 1, "dash": "dash"}
        })

    layout["annotations"].extend(annotations)

    # Create figure
    fig = go.Figure(data=[trace], layout=layout)
    
    # Update axes
    fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
    fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

    # Update figure layout
    fig.update_layout(
        autosize=True,
        title=dict(font=dict(size=16, color='#333'), x=0.5),
        margin=dict(l=40, r=40, b=40, t=60),
        hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
        legend_title=dict(font=dict(size=12, color='#333')),
    )

    # Ensure the directory exists
    output_dir = 'new_folder1'
    os.makedirs(output_dir, exist_ok=True)

    # Save the plot to an HTML file
    output_file = os.path.join(output_dir, f'{survey_type}.html')
    fig.write_html(output_file)

    # Save the plot as an image
    fig.write_image(os.path.join(output_dir, f"plot_{survey_type}_{mr_no}.jpg"))

# Function to generate graphs for PROMIS-10 physical and mental health
def generate_physical_and_mental_graphs(mr_no):
    # Fetch and generate physical health graph
    generate_graph(mr_no, 'physical')
    
    # Fetch and generate mental health graph
    generate_graph(mr_no, 'mental')

# Function to generate the graph for physical or mental health based on PROMIS-10 data
def generate_graph(mr_no, health_type):
    ARABIC_MONTH_LABELS = [
        "Baseline<br>(الأساسي)", "2 months<br>(شهر 2)", "3 months<br>(شهر 3)", "4 months<br>(شهر 4)", 
        "5 months<br>(شهر 5)", "6 months<br>(شهر 6)", "7 months<br>(شهر 7)", "8 months<br>(شهر 8)", "9 months<br>(شهر 9)", 
        "10 months<br>(شهر 10)", "11 months<br>(شهر 11)", "12 months<br>(شهر 12)"
    ]

    # Fetch survey responses for PROMIS-10
    responses = fetch_promis_responses(mr_no)
    if not responses:
        print(f"No PROMIS-10 data found for Mr_no: {mr_no}")
        return

    # Calculate raw scores by date
    raw_scores_by_date = calculate_raw_scores(responses, health_type)  # Call the function to calculate scores

    # Convert raw scores to T-scores
    t_scores_by_date = convert_to_t_scores(raw_scores_by_date, health_type)

    dates = sorted(t_scores_by_date.keys())
    scores = [t_scores_by_date[date] for date in dates]

    if not scores:
        print(f"No scores found for {health_type} health")
        return

    # Calculate months since initial date
    initial_date = datetime.strptime(dates[0], "%Y-%m-%d")
    months_since_initial = [(datetime.strptime(date, "%Y-%m-%d") - initial_date).days // 30 + 1 for date in dates]

    # Create trace for the line plot
    trace = go.Scatter(x=months_since_initial, y=scores, name=f"{health_type.capitalize()} Health", mode='lines+markers')

    # Add horizontal line at T-score 50
    horizontal_line = {
        "type": "line",
        "x0": 0,
        "x1": len(months_since_initial) + 1,
        "xref": "x",
        "y0": 50,
        "y1": 50,
        "yref": "y",
        "line": {
            "color": "black",
            "width": 2,
            "dash": "dash"
        }
    }

    # Add annotation for the horizontal line
    horizontal_line_annotation = {
        "xref": "paper",
        "yref": "y",
        "x": 1.02,
        "y": 54,  # Adjust the y position to be above the line
        "text": "Population Average",
        "showarrow": False,
        "font": {
            "color": "black",
            "size": 12
        }
    }

    max_score = 100  # Maximum T-score for gradient calculation
    safe_limit = 50  # Safe limit for gradient calculation

    # Create gradient shapes
    gradient_shapes = create_gradient_shapes(max_score, safe_limit, 'PROMIS-10')

    # Define label annotations
    label_annotations = [
        {"xref": "x", "yref": "y", "x": len(months_since_initial) + 1, "y": 25, "text": "Severe",
         "showarrow": False, "font": {"size": 14, "color": "rgba(0,0,0,0.5)"}},
        {"xref": "x", "yref": "y", "x": len(months_since_initial) + 1, "y": 35, "text": "Moderate",
         "showarrow": False, "font": {"size": 14, "color": "rgba(0,0,0,0.5)"}},
        {"xref": "x", "yref": "y", "x": len(months_since_initial) + 1, "y": 45, "text": "Mild",
         "showarrow": False, "font": {"size": 14, "color": "rgba(0,0,0,0.5)"}},
        {"xref": "x", "yref": "y", "x": len(months_since_initial) + 1, "y": 65, "text": "Within Normal Limits",
         "showarrow": False, "font": {"size": 14, "color": "rgba(0,0,0,0.5)"}}
    ]

    # Define layout for the plot
    layout = {
        "title": f'{health_type.capitalize()} Health',
        "xaxis": dict(
            title='Timeline (Months)',
            tickvals=list(range(1, len(months_since_initial) + 2)),  # Extend by 1 month
            ticktext=ARABIC_MONTH_LABELS[:len(months_since_initial) + 1],  # Use the Arabic labels
            range=[0.5, len(months_since_initial) + 1.5]  # Ensure proper spacing
        ),
        "yaxis": dict(title='T-Score', range=[0, 100]),  # Update Y-axis title to reflect T-scores
        "plot_bgcolor": 'rgba(0,0,0,0)',
        "paper_bgcolor": 'rgba(255,255,255,1)',
        "hovermode": 'closest',
        "shapes": [horizontal_line] + gradient_shapes,
        "annotations": [horizontal_line_annotation] + label_annotations
    }

    # Fetch patient events
    patient_events = fetch_patient_events(mr_no)

    # Create annotations for events
    annotations = []
    for event in patient_events:
        event_date = event["date"]
        annotation_date = datetime.strptime(event_date, "%Y-%m-%d")
        months_since_initial_event = (annotation_date - initial_date).days // 30 + 1
        annotation_x = months_since_initial_event  # Event date in months since initial date
        annotation_y = max_score - 5  # Adjust y-coordinate for annotation text

        annotations.append(
            dict(
                x=annotation_x,
                y=annotation_y,
                xref="x",
                yref="y",
                text=event["event"],
                showarrow=True,
                arrowhead=7,
                ax=0,
                ay=-40
            )
        )

        layout["shapes"].append({
            "type": "line",
            "x0": annotation_x,
            "y0": 0,
            "x1": annotation_x,
            "y1": max_score,
            "line": {"color": "black", "width": 1, "dash": "dash"}
        })

    layout["annotations"].extend(annotations)

    # Create figure
    fig = go.Figure(data=[trace], layout=layout)

    # Ensure the directory exists
    output_dir = 'new_folder'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Save the plot as a file
    fig.write_image(os.path.join(output_dir, f"plot_{health_type}_health_{mr_no}.jpg"))

# Function to fetch PROMIS-10 responses based on Mr_no
def fetch_promis_responses(mr_no):
    document = collection.find_one({"Mr_no": mr_no}, {"PROMIS-10": 1})
    if document and "PROMIS-10" in document:
        return document["PROMIS-10"]
    return {}

# Function to calculate raw scores for physical and mental health
def calculate_raw_scores(responses, health_type):
    raw_scores_by_date = {}
    for key, response in responses.items():
        timestamp = response.get("timestamp")
        date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
        mapped_response = map_db_to_promis(response)
        recoded_response = recode_responses(mapped_response)
        if health_type == 'physical':
            raw_score = sum(recoded_response.get(q + 'r' if q == 'Global07' else q, 0) for q in PHYSICAL_HEALTH_QUESTIONS.keys())
        else:
            raw_score = sum(recoded_response.get(q + 'r' if q == 'Global10' else q, 0) for q in MENTAL_HEALTH_QUESTIONS.keys())
        if date in raw_scores_by_date:
            raw_scores_by_date[date].append(raw_score)
        else:
            raw_scores_by_date[date] = [raw_score]
    return {date: sum(scores) / len(scores) for date, scores in raw_scores_by_date.items()}

# Function to convert raw scores to T-scores
def convert_to_t_scores(raw_scores_by_date, health_type):
    t_scores_by_date = {}
    for date, raw_score in raw_scores_by_date.items():
        if health_type == 'physical':
            t_score = PHYSICAL_HEALTH_T_SCORE_TABLE.get(raw_score, raw_score)
        else:
            t_score = MENTAL_HEALTH_T_SCORE_TABLE.get(raw_score, raw_score)
        t_scores_by_date[date] = t_score
    return t_scores_by_date

# Define the mapping of questions to physical and mental health
PHYSICAL_HEALTH_QUESTIONS = {
    "Global03": "In general, how would you rate your physical health?",
    "Global06": "To what extent are you able to carry out your everyday physical activities such as walking, climbing stairs, carrying groceries, or moving a chair?",
    "Global07": "How would you rate your pain on average?",
    "Global08": "How would you rate your fatigue on average?"
}

MENTAL_HEALTH_QUESTIONS = {
    "Global02": "In general, would you say your quality of life is:",
    "Global04": "In general, how would you rate your mental health, including your mood and your ability to think?",
    "Global05": "In general, how would you rate your satisfaction with your social activities and relationships?",
    "Global10": "How often have you been bothered by emotional problems such as feeling anxious, depressed, or irritable?"
}

# Define the mapping from database fields to PROMIS Global Health items
DB_TO_PROMIS_MAPPING = {
    "In general, how would you rate your physical health?": "Global03",
    "To what extent are you able to carry out your everyday physical activities such as walking, climbing stairs, carrying groceries, or moving a chair?": "Global06",
    "How would you rate your pain on average?": "Global07",
    "How would you rate your fatigue on average?": "Global08",
    "In general, would you say your quality of life is:": "Global02",
    "In general, how would you rate your mental health, including your mood and your ability to think?": "Global04",
    "In general, how would you rate your satisfaction with your social activities and relationships?": "Global05",
    "How often have you been bothered by emotional problems such as feeling anxious, depressed, or irritable?": "Global10"
}

# Define T-score conversion tables
PHYSICAL_HEALTH_T_SCORE_TABLE = {
    4: 16.2, 5: 19.9, 6: 23.5, 7: 26.7, 8: 29.6, 9: 32.4, 10: 34.9,
    11: 37.4, 12: 39.8, 13: 42.3, 14: 44.9, 15: 47.7, 16: 50.8, 17: 54.1, 18: 57.1, 19: 61.9, 20: 67.7
}
MENTAL_HEALTH_T_SCORE_TABLE = {
    4: 21.2, 5: 25.1, 6: 28.4, 7: 31.3, 8: 33.8, 9: 36.3, 10: 38.8,
    11: 41.1, 12: 43.5, 13: 45.8, 14: 48.3, 15: 50.8, 16: 53.3, 17: 56.0, 18: 59.0, 19: 62.5, 20: 67.6
}

# Function to recode responses as per PROMIS v1.2
def recode_responses(response):
    recoded_response = {}
    for key, value in response.items():
        if key == 'timestamp':
            continue  # Skip the timestamp field
        try:
            value = int(value)
            if key == 'Global07':
                # Recode Global07 (pain) in reverse
                if value == 0:
                    recoded_response[key + 'r'] = 5
                elif 1 <= value <= 3:
                    recoded_response[key + 'r'] = 4
                elif 4 <= value <= 6:
                    recoded_response[key + 'r'] = 3
                elif 7 <= value <= 9:
                    recoded_response[key + 'r'] = 2
                elif value == 10:
                    recoded_response[key + 'r'] = 1
            else:
                # Directly use the value for other keys
                recoded_response[key] = value
        except (ValueError, TypeError) as e:
            print(f"Skipping non-integer value for {key}: {value} ({e})")
    return recoded_response

# Function to map database fields to PROMIS Global Health items
def map_db_to_promis(response):
    mapped_response = {}
    for db_field, promis_field in DB_TO_PROMIS_MAPPING.items():
        if db_field in response:
            mapped_response[promis_field] = response[db_field]
    return mapped_response

# Get the Mr_no and survey_type from command-line arguments
try:
    mr_no = str(sys.argv[1])
    survey_type = str(sys.argv[2])
except IndexError:
    print("No input value provided.")
    sys.exit(1)
except ValueError:
    print("Invalid input value. Please provide valid Mr_no and survey_type.")
    sys.exit(1)

# Generate graphs for PROMIS-10 physical and mental health if survey_type is PROMIS-10
if survey_type == 'PROMIS-10':
    generate_physical_and_mental_graphs(mr_no)
else:
    # Call the function with the input values and show the graph for other survey types
    graph_generate(mr_no, survey_type)
