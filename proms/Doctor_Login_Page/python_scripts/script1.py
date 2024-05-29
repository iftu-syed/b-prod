# # # # import pymongo
# # # # from datetime import datetime
# # # # import plotly.graph_objs as go
# # # # from collections import defaultdict

# # # # # Connect to MongoDB
# # # # client = pymongo.MongoClient("mongodb://localhost:27017/")  # Update with your MongoDB connection string
# # # # db = client["Data_Entry_Incoming"]
# # # # collection = db["patient_data"]

# # # # # Function to fetch survey responses based on Mr_no and survey type
# # # # def fetch_survey_responses(mr_no, survey_type):
# # # #     survey_responses = []
# # # #     cursor = collection.find({"Mr_no": mr_no, survey_type: {"$exists": True}})
# # # #     for response in cursor:
# # # #         survey_responses.extend(response[survey_type].values())
# # # #     return survey_responses

# # # # # Function to aggregate scores for each date
# # # # def aggregate_scores_by_date(survey_responses):
# # # #     scores_by_date = defaultdict(int)
# # # #     date_responses = defaultdict(list)
# # # #     for response in survey_responses:
# # # #         timestamp = response.get('timestamp')
# # # #         date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
# # # #         scores = [int(score) for key, score in response.items() if key != 'Mr_no' and key != 'timestamp']
# # # #         scores_by_date[date] += sum(scores)
# # # #         date_responses[date].append(response)
# # # #     return scores_by_date, date_responses

# # # # # Function to fetch patient name based on Mr_no
# # # # def fetch_patient_name(mr_no):
# # # #     patient_data = collection.find_one({"Mr_no": mr_no}, {"Name": 1})
# # # #     if patient_data:
# # # #         return patient_data.get("Name")
# # # #     else:
# # # #         return "Unknown"

# # # # # Function to create hover text for each point
# # # # def create_hover_text(date_responses):
# # # #     hover_texts = []
# # # #     for date, responses in date_responses.items():
# # # #         hover_text = f"<b>Date:</b> {date}<br><br>"
# # # #         for response in responses:
# # # #             hover_text += "<b>Question:</b> {}<br>".format("<br>".join([f"{key}: {value}" for key, value in response.items() if key != 'Mr_no' and key != 'timestamp']))
# # # #         hover_texts.append(hover_text)
# # # #     return hover_texts

# # # # # Function to generate the graph
# # # # def graph_generate(mr_no, survey_type):
# # # #     # Fetch patient name
# # # #     patient_name = fetch_patient_name(mr_no)
    
# # # #     # Fetch survey responses and aggregate scores by date
# # # #     survey_responses = fetch_survey_responses(mr_no, survey_type)
# # # #     scores_by_date, date_responses = aggregate_scores_by_date(survey_responses)

# # # #     # Create traces for the survey type
# # # #     all_dates = sorted(scores_by_date.keys())
# # # #     scores = [scores_by_date[date] for date in all_dates]
# # # #     hover_text = create_hover_text(date_responses)

# # # #     # Create trace for the line plot
# # # #     trace = go.Scatter(x=all_dates, y=scores, name=survey_type, mode='lines+markers',
# # # #                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
# # # #                        line=dict(width=2),
# # # #                        marker=dict(size=8))

# # # #     # Create layout
# # # #     max_score = max(scores) + 5
# # # #     layout = {
# # # #         "title": f'Mr_no : {mr_no} | Name : {patient_name} | Survey Type : {survey_type}',
# # # #         "xaxis": dict(title='Timeline', tickvals=all_dates, ticktext=all_dates),
# # # #         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
# # # #         "plot_bgcolor": 'rgba(0,0,0,0)',
# # # #         "paper_bgcolor": 'rgba(0,0,0,0)',
# # # #         "hovermode": 'closest',
# # # #         "legend": {
# # # #             "x": 0.02,
# # # #             "y": 0.98,
# # # #             "bgcolor": 'rgba(255,255,255,0.5)',
# # # #             "bordercolor": 'rgba(0,0,0,0.5)',
# # # #             "borderwidth": 2
# # # #         }
# # # #     }

# # # #     # Create figure
# # # #     fig = go.Figure(data=[trace], layout=layout)
    
# # # #     # Update axes
# # # #     fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
# # # #     fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

# # # #     # Update figure layout
# # # #     fig.update_layout(
# # # #         autosize=True,
# # # #         title=dict(font=dict(size=16, color='#333'), x=0.5),
# # # #         margin=dict(l=40, r=40, b=40, t=60),
# # # #         hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
# # # #         legend_title=dict(font=dict(size=12, color='#333')),
# # # #     )

# # # #     # Show the plot
# # # #     fig.show()

# # # # # Get the Mr_no and survey_type from command-line arguments
# # # # import sys

# # # # try:
# # # #     mr_no = str(sys.argv[1])
# # # #     survey_type = str(sys.argv[2])
# # # # except IndexError:
# # # #     print("No input value provided.")
# # # #     sys.exit(1)
# # # # except ValueError:
# # # #     print("Invalid input value. Please provide valid Mr_no and survey_type.")
# # # #     sys.exit(1)

# # # # # Call the function with the input values and show the graph
# # # # graph_generate(mr_no, survey_type)



# # # import pymongo
# # # from datetime import datetime
# # # import plotly.graph_objs as go
# # # from collections import defaultdict

# # # # Connect to MongoDB
# # # client = pymongo.MongoClient("mongodb://localhost:27017/")  # Update with your MongoDB connection string
# # # db = client["Data_Entry_Incoming"]
# # # collection = db["patient_data"]

# # # # Function to fetch survey responses based on Mr_no and survey type
# # # def fetch_survey_responses(mr_no, survey_type):
# # #     survey_responses = []
# # #     cursor = collection.find({"Mr_no": mr_no})
# # #     for response in cursor:
# # #         if survey_type in response:
# # #             survey_responses.extend(response[survey_type].values())
# # #     return survey_responses

# # # # Function to aggregate scores for each date
# # # def aggregate_scores_by_date(survey_responses):
# # #     scores_by_date = defaultdict(int)
# # #     date_responses = defaultdict(list)
# # #     for response in survey_responses:
# # #         timestamp = response.get('timestamp')
# # #         date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
# # #         scores = [int(score) for key, score in response.items() if key != 'Mr_no' and key != 'timestamp']
# # #         scores_by_date[date] += sum(scores)
# # #         date_responses[date].append(response)
# # #     return scores_by_date, date_responses

# # # # Function to fetch patient name based on Mr_no
# # # def fetch_patient_name(mr_no):
# # #     patient_data = collection.find_one({"Mr_no": mr_no}, {"Name": 1})
# # #     if patient_data:
# # #         return patient_data.get("Name")
# # #     else:
# # #         return "Unknown"

# # # # Function to create hover text for each point
# # # def create_hover_text(date_responses):
# # #     hover_texts = []
# # #     for date, responses in date_responses.items():
# # #         hover_text = f"<b>Date:</b> {date}<br><br>"
# # #         for response in responses:
# # #             hover_text += "<b>Response:</b><br>{}<br>".format("<br>".join([f"{key}: {value}" for key, value in response.items() if key != 'Mr_no' and key != 'timestamp']))
# # #         hover_texts.append(hover_text)
# # #     return hover_texts

# # # # Function to generate the graph
# # # def graph_generate(mr_no, survey_type):
# # #     # Fetch patient name
# # #     patient_name = fetch_patient_name(mr_no)
    
# # #     # Fetch survey responses and aggregate scores by date
# # #     survey_responses = fetch_survey_responses(mr_no, survey_type)
    
# # #     # Debugging output to check if responses are fetched correctly
# # #     print(f"Survey responses for {survey_type}: {survey_responses}")
    
# # #     scores_by_date, date_responses = aggregate_scores_by_date(survey_responses)

# # #     # Create traces for the survey type
# # #     all_dates = sorted(scores_by_date.keys())
# # #     scores = [scores_by_date[date] for date in all_dates]
# # #     hover_text = create_hover_text(date_responses)

# # #     # Debugging output to check the scores and dates
# # #     print(f"All dates: {all_dates}")
# # #     print(f"Scores: {scores}")

# # #     if not scores:
# # #         print(f"No data found for survey type {survey_type}")
# # #         return

# # #     # Create trace for the line plot
# # #     trace = go.Scatter(x=all_dates, y=scores, name=survey_type, mode='lines+markers',
# # #                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
# # #                        line=dict(width=2),
# # #                        marker=dict(size=8))

# # #     # Create layout
# # #     max_score = max(scores) + 5
# # #     layout = {
# # #         "title": f'Mr_no : {mr_no} | Name : {patient_name} | Survey Type : {survey_type}',
# # #         "xaxis": dict(title='Timeline', tickvals=all_dates, ticktext=all_dates),
# # #         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
# # #         "plot_bgcolor": 'rgba(0,0,0,0)',
# # #         "paper_bgcolor": 'rgba(0,0,0,0)',
# # #         "hovermode": 'closest',
# # #         "legend": {
# # #             "x": 0.02,
# # #             "y": 0.98,
# # #             "bgcolor": 'rgba(255,255,255,0.5)',
# # #             "bordercolor": 'rgba(0,0,0,0.5)',
# # #             "borderwidth": 2
# # #         }
# # #     }

# # #     # Create figure
# # #     fig = go.Figure(data=[trace], layout=layout)
    
# # #     # Update axes
# # #     fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
# # #     fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

# # #     # Update figure layout
# # #     fig.update_layout(
# # #         autosize=True,
# # #         title=dict(font=dict(size=16, color='#333'), x=0.5),
# # #         margin=dict(l=40, r=40, b=40, t=60),
# # #         hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
# # #         legend_title=dict(font=dict(size=12, color='#333')),
# # #     )

# # #     # Show the plot
# # #     fig.show()

# # # # Get the Mr_no and survey_type from command-line arguments
# # # import sys

# # # try:
# # #     mr_no = str(sys.argv[1])
# # #     survey_type = str(sys.argv[2])
# # # except IndexError:
# # #     print("No input value provided.")
# # #     sys.exit(1)
# # # except ValueError:
# # #     print("Invalid input value. Please provide valid Mr_no and survey_type.")
# # #     sys.exit(1)

# # # # Call the function with the input values and show the graph
# # # graph_generate(mr_no, survey_type)





# # import pymongo
# # from datetime import datetime
# # import plotly.graph_objs as go
# # from collections import defaultdict

# # # Connect to MongoDB
# # client = pymongo.MongoClient("mongodb://localhost:27017/")  # Update with your MongoDB connection string
# # db = client["Data_Entry_Incoming"]
# # collection = db["patient_data"]

# # # Function to fetch survey responses based on Mr_no and survey type
# # def fetch_survey_responses(mr_no, survey_type):
# #     survey_responses = []
# #     cursor = collection.find({"Mr_no": mr_no})
# #     for response in cursor:
# #         if survey_type in response:
# #             survey_responses.extend(response[survey_type].values())
# #     return survey_responses

# # # Function to aggregate scores for each date
# # def aggregate_scores_by_date(survey_responses):
# #     scores_by_date = defaultdict(int)
# #     date_responses = defaultdict(list)
# #     for response in survey_responses:
# #         timestamp = response.get('timestamp')
# #         date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
# #         scores = [int(score) for key, score in response.items() if key != 'Mr_no' and key != 'timestamp']
# #         scores_by_date[date] += sum(scores)
# #         date_responses[date].append(response)
# #     return scores_by_date, date_responses

# # # Function to fetch patient name based on Mr_no
# # def fetch_patient_name(mr_no):
# #     patient_data = collection.find_one({"Mr_no": mr_no}, {"Name": 1})
# #     if patient_data:
# #         return patient_data.get("Name")
# #     else:
# #         return "Unknown"

# # # Function to create hover text for each point
# # def create_hover_text(date_responses):
# #     hover_texts = []
# #     for date, responses in date_responses.items():
# #         hover_text = f"<b>Date:</b> {date}<br><br>"
# #         for response in responses:
# #             hover_text += "<b>Response:</b><br>{}<br>".format("<br>".join([f"{key}: {value}" for key, value in response.items() if key != 'Mr_no' and key != 'timestamp']))
# #         hover_texts.append(hover_text)
# #     return hover_texts

# # # Function to create gradient background shapes
# # def create_gradient_shapes(max_score, safe_limit):
# #     gradient_steps = 100
# #     shapes = []

# #     for i in range(gradient_steps):
# #         shapes.append({
# #             "type": "rect",
# #             "xref": "paper",
# #             "yref": "y",
# #             "x0": 0,
# #             "x1": 1,
# #             "y0": i * safe_limit / gradient_steps,
# #             "y1": (i + 1) * safe_limit / gradient_steps,
# #             "fillcolor": f"rgba(0, 255, 0, {0.2 * (1 - i / gradient_steps)})",
# #             "layer": "below",
# #             "line": {"width": 0}
# #         })
# #         shapes.append({
# #             "type": "rect",
# #             "xref": "paper",
# #             "yref": "y",
# #             "x0": 0,
# #             "x1": 1,
# #             "y0": safe_limit + i * (max_score - safe_limit) / gradient_steps,
# #             "y1": safe_limit + (i + 1) * (max_score - safe_limit) / gradient_steps,
# #             "fillcolor": f"rgba(255, 0, 0, {0.2 * (i / gradient_steps)})",
# #             "layer": "below",
# #             "line": {"width": 0}
# #         })

# #     return shapes

# # # Function to get the threshold for different survey types
# # def get_threshold(survey_type):
# #     thresholds = {
# #         'EPDS': 12,
# #         'PROMIS-10': 20,
# #         'ICIQ-UI_SF': 10,
# #         'PAID': 8,
# #         'Wexner': 15,
# #         'PBQ': 25,
# #         # Add other survey types and their thresholds here
# #     }
# #     return thresholds.get(survey_type, 10)  # Default threshold is 10

# # # Function to generate the graph
# # def graph_generate(mr_no, survey_type):
# #     # Fetch patient name
# #     patient_name = fetch_patient_name(mr_no)
    
# #     # Fetch survey responses and aggregate scores by date
# #     survey_responses = fetch_survey_responses(mr_no, survey_type)
    
# #     # Debugging output to check if responses are fetched correctly
# #     print(f"Survey responses for {survey_type}: {survey_responses}")
    
# #     scores_by_date, date_responses = aggregate_scores_by_date(survey_responses)

# #     # Create traces for the survey type
# #     all_dates = sorted(scores_by_date.keys())
# #     scores = [scores_by_date[date] for date in all_dates]
# #     hover_text = create_hover_text(date_responses)

# #     # Debugging output to check the scores and dates
# #     print(f"All dates: {all_dates}")
# #     print(f"Scores: {scores}")

# #     if not scores:
# #         print(f"No data found for survey type {survey_type}")
# #         return

# #     # Create trace for the line plot
# #     trace = go.Scatter(x=all_dates, y=scores, name=survey_type, mode='lines+markers',
# #                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
# #                        line=dict(width=2),
# #                        marker=dict(size=8))

# #     # Get the threshold for the survey type
# #     safe_limit = get_threshold(survey_type)

# #     # Create layout
# #     max_score = max(scores) + 5
# #     layout = {
# #         "title": f'Mr_no : {mr_no} | Name : {patient_name} | Survey Type : {survey_type}',
# #         "xaxis": dict(title='Timeline', tickvals=all_dates, ticktext=all_dates),
# #         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
# #         "plot_bgcolor": 'rgba(0,0,0,0)',
# #         "paper_bgcolor": 'rgba(0,0,0,0)',
# #         "hovermode": 'closest',
# #         "legend": {
# #             "x": 0.02,
# #             "y": 0.98,
# #             "bgcolor": 'rgba(255,255,255,0.5)',
# #             "bordercolor": 'rgba(0,0,0,0.5)',
# #             "borderwidth": 2
# #         },
# #         "shapes": create_gradient_shapes(max_score, safe_limit)
# #     }

# #     # Create figure
# #     fig = go.Figure(data=[trace], layout=layout)
    
# #     # Update axes
# #     fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
# #     fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

# #     # Update figure layout
# #     fig.update_layout(
# #         autosize=True,
# #         title=dict(font=dict(size=16, color='#333'), x=0.5),
# #         margin=dict(l=40, r=40, b=40, t=60),
# #         hoverlabel=dict(font=dict(size=12), bgcolor='rgba(255,255,255,0.8)', bordercolor='rgba(0,0,0,0.5)'),
# #         legend_title=dict(font=dict(size=12, color='#333')),
# #     )

# #     # Show the plot
# #     fig.show()

# # # Get the Mr_no and survey_type from command-line arguments
# # import sys

# # try:
# #     mr_no = str(sys.argv[1])
# #     survey_type = str(sys.argv[2])
# # except IndexError:
# #     print("No input value provided.")
# #     sys.exit(1)
# # except ValueError:
# #     print("Invalid input value. Please provide valid Mr_no and survey_type.")
# #     sys.exit(1)

# # # Call the function with the input values and show the graph
# # graph_generate(mr_no, survey_type)






# import pymongo
# from datetime import datetime
# import plotly.graph_objs as go
# from collections import defaultdict

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

# # Function to aggregate scores for each date
# def aggregate_scores_by_date(survey_responses):
#     scores_by_date = defaultdict(int)
#     date_responses = defaultdict(list)
#     for response in survey_responses:
#         timestamp = response.get('timestamp')
#         date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
#         scores = [int(score) for key, score in response.items() if key != 'Mr_no' and key != 'timestamp']
#         scores_by_date[date] += sum(scores)
#         date_responses[date].append(response)
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
# def create_gradient_shapes(max_score, safe_limit):
#     gradient_steps = 100
#     shapes = []

#     for i in range(gradient_steps):
#         shapes.append({
#             "type": "rect",
#             "xref": "paper",
#             "yref": "y",
#             "x0": 0,
#             "x1": 1,
#             "y0": i * safe_limit / gradient_steps,
#             "y1": (i + 1) * safe_limit / gradient_steps,
#             "fillcolor": f"rgba(0, 255, 0, {0.2 * (1 - i / gradient_steps)})",
#             "layer": "below",
#             "line": {"width": 0}
#         })
#         shapes.append({
#             "type": "rect",
#             "xref": "paper",
#             "yref": "y",
#             "x0": 0,
#             "x1": 1,
#             "y0": safe_limit + i * (max_score - safe_limit) / gradient_steps,
#             "y1": safe_limit + (i + 1) * (max_score - safe_limit) / gradient_steps,
#             "fillcolor": f"rgba(255, 0, 0, {0.2 * (i / gradient_steps)})",
#             "layer": "below",
#             "line": {"width": 0}
#         })

#     return shapes

# # Function to get the threshold for different survey types
# def get_threshold(survey_type):
#     thresholds = {
#         'EPDS': 12,
#         'PROMIS-10': 20,
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

#     # Create trace for the line plot
#     trace = go.Scatter(x=all_dates, y=scores, name=survey_type, mode='lines+markers',
#                        hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=hover_text,
#                        line=dict(width=2),
#                        marker=dict(size=8))

#     # Get the threshold for the survey type
#     safe_limit = get_threshold(survey_type)

#     # Create layout
#     max_score = max(scores) + 5
#     layout = {
#         "title": f'Mr_no : {mr_no} | Name : {patient_name} | Survey Type : {survey_type}',
#         "xaxis": dict(title='Timeline', tickvals=all_dates, ticktext=all_dates),
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
#         "shapes": create_gradient_shapes(max_score, safe_limit)
#     }

#     # Fetch patient events
#     patient_events = fetch_patient_events(mr_no)
    
#     annotations = []
#     for event in patient_events:
#         event_date = event["date"]
#         annotation_x = event_date  # Event date in "YYYY-MM-DD" format
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

#         # Add event date to the x-axis tick values if not already present
#         if annotation_x not in all_dates:
#             all_dates.append(annotation_x)
#             all_dates.sort()

#     layout["annotations"] = annotations
#     layout["xaxis"]["tickvals"] = all_dates
#     layout["xaxis"]["ticktext"] = all_dates

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

#     # Show the plot
#     fig.show()

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



# import pymongo
# from datetime import datetime, timedelta
# import plotly.graph_objs as go
# from collections import defaultdict

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

# # Function to aggregate scores for each date
# def aggregate_scores_by_date(survey_responses):
#     scores_by_date = defaultdict(int)
#     date_responses = defaultdict(list)
#     for response in survey_responses:
#         timestamp = response.get('timestamp')
#         date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
#         scores = [int(score) for key, score in response.items() if key != 'Mr_no' and key != 'timestamp']
#         scores_by_date[date] += sum(scores)
#         date_responses[date].append(response)
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
# def create_gradient_shapes(max_score, safe_limit):
#     gradient_steps = 100
#     shapes = []

#     for i in range(gradient_steps):
#         shapes.append({
#             "type": "rect",
#             "xref": "paper",
#             "yref": "y",
#             "x0": 0,
#             "x1": 1,
#             "y0": i * safe_limit / gradient_steps,
#             "y1": (i + 1) * safe_limit / gradient_steps,
#             "fillcolor": f"rgba(0, 255, 0, {0.2 * (1 - i / gradient_steps)})",
#             "layer": "below",
#             "line": {"width": 0}
#         })
#         shapes.append({
#             "type": "rect",
#             "xref": "paper",
#             "yref": "y",
#             "x0": 0,
#             "x1": 1,
#             "y0": safe_limit + i * (max_score - safe_limit) / gradient_steps,
#             "y1": safe_limit + (i + 1) * (max_score - safe_limit) / gradient_steps,
#             "fillcolor": f"rgba(255, 0, 0, {0.2 * (i / gradient_steps)})",
#             "layer": "below",
#             "line": {"width": 0}
#         })

#     return shapes

# # Function to get the threshold for different survey types
# def get_threshold(survey_type):
#     thresholds = {
#         'EPDS': 12,
#         'PROMIS-10': 20,
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
#         "xaxis": dict(title='Timeline (Months)', tickvals=list(range(1, 13)), ticktext=[f"{i} month{'s' if i > 1 else ''}" for i in range(1, 13)]),
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
#         "shapes": create_gradient_shapes(max_score, safe_limit)
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

#     layout["annotations"] = annotations

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

#     # Show the plot
#     fig.show()

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




# import pymongo
# from datetime import datetime
# import plotly.graph_objs as go
# from collections import defaultdict

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
#         "xaxis": dict(title='Timeline (Months)', tickvals=list(range(1, 13)), ticktext=[f"{i} month{'s' if i > 1 else ''}" for i in range(1, 13)]),
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
#         "shapes": create_gradient_shapes(max_score, safe_limit, survey_type)
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

#     layout["annotations"] = annotations

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

#     # Show the plot
#     fig.show()

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



#this is the code to generate the grpahs and store these in the new_folder to use them as thumbnails for the doctor-view


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
#         "xaxis": dict(title='Timeline (Months)', tickvals=list(range(1, 13)), ticktext=[f"{i} month{'s' if i > 1 else ''}" for i in range(1, 13)]),
#         "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
#         "plot_bgcolor": 'rgba(0,0,0,0)',
#         "paper_bgcolor": 'rgba(255,255,255,1)',
#         "hovermode": 'closest',
#         "legend": {
#             "x": 0.02,
#             "y": 0.98,
#             "bgcolor": 'rgba(255,255,255,0.5)',
#             "bordercolor": 'rgba(0,0,0,0.5)',
#             "borderwidth": 2
#         },
#         "shapes": create_gradient_shapes(max_score, safe_limit, survey_type)
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

#     layout["annotations"] = annotations

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

#     # Save the plot as a file
#     output_dir = 'new_folder'
#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     fig.write_image(os.path.join(output_dir, f"plot_{survey_type}.jpg"))

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











#this is the code that handle baseline and labelling on graphs(severe,moderte,mild)




import pymongo
from datetime import datetime
import plotly.graph_objs as go
from collections import defaultdict
import os

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
        "paper_bgcolor": 'rgba(255,255,255,1)',
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

    # Save the plot as a file
    output_dir = 'new_folder'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    fig.write_image(os.path.join(output_dir, f"plot_{survey_type}.jpg"))

# Get the Mr_no and survey_type from command-line arguments
import sys

try:
    mr_no = str(sys.argv[1])
    survey_type = str(sys.argv[2])
except IndexError:
    print("No input value provided.")
    sys.exit(1)
except ValueError:
    print("Invalid input value. Please provide valid Mr_no and survey_type.")
    sys.exit(1)

# Call the function with the input values and show the graph
graph_generate(mr_no, survey_type)
