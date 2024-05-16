# import dash
# from dash import dcc, html, Input, Output
# import pymongo
# from datetime import datetime
# import plotly.graph_objs as go
# from collections import defaultdict

# # Initialize Dash app
# app = dash.Dash(__name__)

# # Connect to MongoDB
# client = pymongo.MongoClient("mongodb://localhost:27017/")  # Update with your MongoDB connection string
# db = client["Data_Entry_Incoming"]
# collection = db["patient_data"]

# # Function to fetch survey responses based on Mr_no and survey type
# def fetch_survey_responses(mr_no, survey_type):
#     survey_responses = []
#     cursor = collection.find({"Mr_no": mr_no, survey_type: {"$exists": True}})
#     for response in cursor:
#         survey_responses.extend(response[survey_type].values())
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

# # Function to fetch survey date based on Mr_no
# def fetch_survey_date(mr_no):
#     survey_data = collection.find_one({"Mr_no": mr_no})
#     if survey_data and "dateOfSurgery" in survey_data:
#         survey_date = datetime.strptime(survey_data["dateOfSurgery"], "%Y-%m-%d")
#         return survey_date
#     else:
#         return "Unknown"

# # Function to create hover text for each point
# def create_hover_text(date_responses):
#     hover_texts = []
#     for date, responses in date_responses.items():
#         hover_text = f"<b>Date:</b> {date}<br><br>"
#         for response in responses:
#             hover_text += "<b>Question:</b> {}<br>".format("<br>".join([f"{key}: {value}" for key, value in response.items() if key != 'Mr_no' and key != 'timestamp']))
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

# # Function to generate the graph
# def graph_generate(mr_no):
#     # Fetch patient name
#     patient_name = fetch_patient_name(mr_no)
#     # Fetch survey date
#     survey_date = fetch_survey_date(mr_no)
    
#     # Fetch CCFFIS survey responses and aggregate scores by date
#     ccffis_responses = fetch_survey_responses(mr_no, "CCFFIS")
#     ccffis_scores_by_date, ccffis_date_responses = aggregate_scores_by_date(ccffis_responses)

#     # Fetch EPDS survey responses and aggregate scores by date
#     epds_responses = fetch_survey_responses(mr_no, "EPDS")
#     epds_scores_by_date, epds_date_responses = aggregate_scores_by_date(epds_responses)

#     # Fetch PAID survey responses and aggregate scores by date
#     paid_responses = fetch_survey_responses(mr_no, "PAID")
#     paid_scores_by_date, paid_date_responses = aggregate_scores_by_date(paid_responses)

#     # Fetch PROMS_10 survey responses and aggregate scores by date
#     proms_10_responses = fetch_survey_responses(mr_no, "PROMS_10")
#     proms_10_scores_by_date, proms_10_date_responses = aggregate_scores_by_date(proms_10_responses)

#     # Combine all dates from all surveys and remove duplicates
#     all_dates = list(set(list(ccffis_scores_by_date.keys()) + list(epds_scores_by_date.keys()) + list(paid_scores_by_date.keys()) + list(proms_10_scores_by_date.keys())))
#     all_dates.sort()

#     # Check if any survey data exists
#     if ccffis_scores_by_date or epds_scores_by_date or paid_scores_by_date or proms_10_scores_by_date:
#         # Create traces for each survey type if data exists
#         data = []

#         if ccffis_scores_by_date:
#             # Create traces for CCFFIS line plot
#             ccffis_scores = [ccffis_scores_by_date[date] for date in all_dates]

#             # Create hover text for each point
#             ccffis_hover_text = create_hover_text(ccffis_date_responses)

#             # Add CCFFIS trace
#             data.append(go.Scatter(x=all_dates, y=ccffis_scores, name='Stool incontinence survey', mode='lines+markers',
#                                 hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=ccffis_hover_text,
#                                 line=dict(color='rgba(255, 0, 0, 0.7)', width=2),
#                                 marker=dict(color='rgba(255, 0, 0, 1)', size=8)))

#         if epds_scores_by_date:
#             # Create traces for EPDS line plot
#             epds_scores = [epds_scores_by_date[date] for date in all_dates]

#             # Create hover text for each point
#             epds_hover_text = create_hover_text(epds_date_responses)

#             # Add EPDS trace
#             data.append(go.Scatter(x=all_dates, y=epds_scores, name='Mental Health Resilience after pregnancy', mode='lines+markers',
#                                 hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=epds_hover_text,
#                                 line=dict(color='rgba(0, 0, 255, 0.7)', width=2),
#                                 marker=dict(color='rgba(0, 0, 255, 1)', size=8)))

#         if paid_scores_by_date:
#             # Create traces for PAID line plot
#             paid_scores = [paid_scores_by_date[date] for date in all_dates]

#             # Create hover text for each point
#             paid_hover_text = create_hover_text(paid_date_responses)

#             # Add PAID trace
#             data.append(go.Scatter(x=all_dates, y=paid_scores, name='PAID Scores', mode='lines+markers',
#                                 hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=paid_hover_text,
#                                 line=dict(color='rgba(0, 128, 0, 0.7)', width=2),
#                                 marker=dict(color='rgba(0, 128, 0, 1)', size=8)))

#         if proms_10_scores_by_date:
#             # Create traces for PROMS_10 line plot
#             proms_10_scores = [proms_10_scores_by_date[date] for date in all_dates]

#             # Create hover text for each point
#             proms_10_hover_text = create_hover_text(proms_10_date_responses)

#             # Add PROMS_10 trace
#             data.append(go.Scatter(x=all_dates, y=proms_10_scores, name='PROMS_10', mode='lines+markers',
#                                 hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=proms_10_hover_text,
#                                 line=dict(color='rgba(255, 165, 0, 0.7)', width=2),
#                                 marker=dict(color='rgba(255, 165, 0, 1)', size=8)))

#         # Create layout
#         max_score = max(max(ccffis_scores_by_date.values(), default=0), max(epds_scores_by_date.values(), default=0), max(paid_scores_by_date.values(), default=0), max(proms_10_scores_by_date.values(), default=0)) + 5
#         layout = {
#             "title": f'Mr_no : {mr_no} | Name : {patient_name} | Date Of Intervention : {survey_date}',
#             "xaxis": dict(title='Timeline', tickvals=all_dates, ticktext=all_dates),
#             "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
#             "plot_bgcolor": 'rgba(0,0,0,0)',
#             "paper_bgcolor": 'rgba(0,0,0,0)',
#             "hovermode": 'closest',
#             "legend": {
#                 "x": 0.02,
#                 "y": 0.98,
#                 "bgcolor": 'rgba(255,255,255,0.5)',
#                 "bordercolor": 'rgba(0,0,0,0.5)',
#                 "borderwidth": 2
#             },
#             "shapes": create_gradient_shapes(max_score, 12)  # Default to CCFFIS gradient
#         }

#         # Fetch survey date
#         survey_date = fetch_survey_date(mr_no)

#         # Check if survey date is available
#         if survey_date != "Unknown":
#             annotation_x = survey_date.strftime("%Y-%m-%d")  # Convert survey date to string in the format "YYYY-MM-DD"
#             annotation_y = 15  # Example annotation y-coordinate

#             # Add annotations
#             annotations = [
#                 dict(
#                     x=annotation_x,
#                     y=annotation_y,
#                     xref="x",
#                     yref="y",
#                     text="Date Of Intervention",
#                     showarrow=True,
#                     arrowhead=7,
#                     ax=0,
#                     ay=-40
#                 )
#             ]

#             layout["annotations"] = annotations

#             # Add vertical line representing the date of surgery
#             layout["shapes"].append({
#                 "type": "line",
#                 "x0": annotation_x,
#                 "y0": 0,
#                 "x1": annotation_x,
#                 "y1": layout["yaxis"]["range"][1],  # Extend the line to the top of the y-axis
#                 "line": {"color": "black", "width": 1, "dash": "dash"}
#             })

#             # Add surgery date to the x-axis tick values
#             if annotation_x not in layout["xaxis"]["tickvals"]:
#                 layout["xaxis"]["tickvals"].append(annotation_x)
#                 layout["xaxis"]["ticktext"].append("Surgery Date")  # Text to display for the surgery date
#         else:
#             print("Survey date not found for the patient.")

#         # Create figure
#         fig = go.Figure(data=data, layout=layout)

#         # Update legend position
#         fig.update_layout(
#             legend=dict(
#                 x=1.02,
#                 y=1,
#                 bgcolor='rgba(255,255,255,0.5)',
#                 bordercolor='rgba(0,0,0,0.5)',
#                 borderwidth=2
#             )
#         )
        
#         # Update axes
#         fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
#         fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

#         # Update figure layout
#         fig.update_layout(
#             autosize=True,
#             margin=dict(l=50, r=50, t=80, b=50),
#             showlegend=True
#         )

#         return fig

#     else:
#         print("No survey data found for the patient.")
#         return None

# # Dash layout
# app.layout = html.Div([
#     dcc.Dropdown(
#         id='survey-dropdown',
#         options=[
#             {'label': 'CCFFIS', 'value': 'CCFFIS'},
#             {'label': 'EPDS', 'value': 'EPDS'},
#             {'label': 'PAID', 'value': 'PAID'},
#             {'label': 'PROMS_10', 'value': 'PROMS_10'}
#         ],
#         value='CCFFIS'
#     ),
#     dcc.Graph(id='survey-graph'),
#     dcc.Input(id='mr-no-input', type='text', value='Enter Mr_no'),
#     html.Button(id='submit-button', n_clicks=0, children='Submit')
# ])

# @app.callback(
#     Output('survey-graph', 'figure'),
#     [Input('submit-button', 'n_clicks')],
#     [dash.dependencies.State('survey-dropdown', 'value'),
#      dash.dependencies.State('mr-no-input', 'value')]
# )
# def update_graph(n_clicks, selected_survey, mr_no):
#     if n_clicks > 0:
#         if selected_survey == 'CCFFIS':
#             safe_limit = 12
#         elif selected_survey == 'EPDS':
#             safe_limit = 12
#         elif selected_survey == 'PAID':
#             safe_limit = 8
#         elif selected_survey == 'PROMS_10':
#             safe_limit = 15  # Adjust this based on actual safe limit for PROMS_10

#         fig = graph_generate(mr_no)
#         if fig:
#             fig.update_layout(shapes=create_gradient_shapes(fig.layout.yaxis.range[1], safe_limit))
#         return fig

#     return go.Figure()

# if __name__ == "__main__":
#     import sys

#     # Get the Mr_no from command-line arguments
#     try:
#         input_value = str(sys.argv[1])
#     except IndexError:
#         print("No input value provided.")
#         sys.exit(1)
#     except ValueError:
#         print("Invalid input value. Please provide a valid Mr_no.")
#         sys.exit(1)

#     # Call the function with the input value and show the graph
#     fig = graph_generate(input_value)
#     if fig:
#         fig.show()


# import dash
# from dash import dcc, html, Input, Output
# import pymongo
# from datetime import datetime
# import plotly.graph_objs as go
# from collections import defaultdict

# # Initialize Dash app
# app = dash.Dash(__name__)

# # Connect to MongoDB
# client = pymongo.MongoClient("mongodb://localhost:27017/")  # Update with your MongoDB connection string
# db = client["Data_Entry_Incoming"]
# collection = db["patient_data"]

# # Function to fetch survey responses based on Mr_no and survey type
# def fetch_survey_responses(mr_no, survey_type):
#     survey_responses = []
#     cursor = collection.find({"Mr_no": mr_no, survey_type: {"$exists": True}})
#     for response in cursor:
#         survey_responses.extend(response[survey_type].values())
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

# # Function to fetch survey date based on Mr_no
# def fetch_survey_date(mr_no):
#     survey_data = collection.find_one({"Mr_no": mr_no})
#     if survey_data and "dateOfSurgery" in survey_data:
#         survey_date = datetime.strptime(survey_data["dateOfSurgery"], "%Y-%m-%d")
#         return survey_date
#     else:
#         return "Unknown"

# # Function to create hover text for each point
# def create_hover_text(date_responses):
#     hover_texts = []
#     for date, responses in date_responses.items():
#         hover_text = f"<b>Date:</b> {date}<br><br>"
#         for response in responses:
#             hover_text += "<b>Question:</b> {}<br>".format("<br>".join([f"{key}: {value}" for key, value in response.items() if key != 'Mr_no' and key != 'timestamp']))
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

# # Function to generate the graph
# def graph_generate(mr_no, safe_limit):
#     # Fetch patient name
#     patient_name = fetch_patient_name(mr_no)
#     # Fetch survey date
#     survey_date = fetch_survey_date(mr_no)
    
#     # Fetch CCFFIS survey responses and aggregate scores by date
#     ccffis_responses = fetch_survey_responses(mr_no, "CCFFIS")
#     ccffis_scores_by_date, ccffis_date_responses = aggregate_scores_by_date(ccffis_responses)

#     # Fetch EPDS survey responses and aggregate scores by date
#     epds_responses = fetch_survey_responses(mr_no, "EPDS")
#     epds_scores_by_date, epds_date_responses = aggregate_scores_by_date(epds_responses)

#     # Fetch PAID survey responses and aggregate scores by date
#     paid_responses = fetch_survey_responses(mr_no, "PAID")
#     paid_scores_by_date, paid_date_responses = aggregate_scores_by_date(paid_responses)

#     # Fetch PROMS_10 survey responses and aggregate scores by date
#     proms_10_responses = fetch_survey_responses(mr_no, "PROMS_10")
#     proms_10_scores_by_date, proms_10_date_responses = aggregate_scores_by_date(proms_10_responses)

#     # Combine all dates from all surveys and remove duplicates
#     all_dates = list(set(list(ccffis_scores_by_date.keys()) + list(epds_scores_by_date.keys()) + list(paid_scores_by_date.keys()) + list(proms_10_scores_by_date.keys())))
#     all_dates.sort()

#     # Check if any survey data exists
#     if ccffis_scores_by_date or epds_scores_by_date or paid_scores_by_date or proms_10_scores_by_date:
#         # Create traces for each survey type if data exists
#         data = []

#         if ccffis_scores_by_date:
#             # Create traces for CCFFIS line plot
#             ccffis_scores = [ccffis_scores_by_date[date] for date in all_dates]

#             # Create hover text for each point
#             ccffis_hover_text = create_hover_text(ccffis_date_responses)

#             # Add CCFFIS trace
#             data.append(go.Scatter(x=all_dates, y=ccffis_scores, name='Stool incontinence survey', mode='lines+markers',
#                                 hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=ccffis_hover_text,
#                                 line=dict(color='rgba(255, 0, 0, 0.7)', width=2),
#                                 marker=dict(color='rgba(255, 0, 0, 1)', size=8)))

#         if epds_scores_by_date:
#             # Create traces for EPDS line plot
#             epds_scores = [epds_scores_by_date[date] for date in all_dates]

#             # Create hover text for each point
#             epds_hover_text = create_hover_text(epds_date_responses)

#             # Add EPDS trace
#             data.append(go.Scatter(x=all_dates, y=epds_scores, name='Mental Health Resilience after pregnancy', mode='lines+markers',
#                                 hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=epds_hover_text,
#                                 line=dict(color='rgba(0, 0, 255, 0.7)', width=2),
#                                 marker=dict(color='rgba(0, 0, 255, 1)', size=8)))

#         if paid_scores_by_date:
#             # Create traces for PAID line plot
#             paid_scores = [paid_scores_by_date[date] for date in all_dates]

#             # Create hover text for each point
#             paid_hover_text = create_hover_text(paid_date_responses)

#             # Add PAID trace
#             data.append(go.Scatter(x=all_dates, y=paid_scores, name='PAID Scores', mode='lines+markers',
#                                 hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=paid_hover_text,
#                                 line=dict(color='rgba(0, 128, 0, 0.7)', width=2),
#                                 marker=dict(color='rgba(0, 128, 0, 1)', size=8)))

#         if proms_10_scores_by_date:
#             # Create traces for PROMS_10 line plot
#             proms_10_scores = [proms_10_scores_by_date[date] for date in all_dates]

#             # Create hover text for each point
#             proms_10_hover_text = create_hover_text(proms_10_date_responses)

#             # Add PROMS_10 trace
#             data.append(go.Scatter(x=all_dates, y=proms_10_scores, name='PROMS_10', mode='lines+markers',
#                                 hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=proms_10_hover_text,
#                                 line=dict(color='rgba(255, 165, 0, 0.7)', width=2),
#                                 marker=dict(color='rgba(255, 165, 0, 1)', size=8)))

#         # Create layout
#         max_score = max(max(ccffis_scores_by_date.values(), default=0), max(epds_scores_by_date.values(), default=0), max(paid_scores_by_date.values(), default=0), max(proms_10_scores_by_date.values(), default=0)) + 5
#         layout = {
#             "title": f'Mr_no : {mr_no} | Name : {patient_name} | Date Of Intervention : {survey_date}',
#             "xaxis": dict(title='Timeline', tickvals=all_dates, ticktext=all_dates),
#             "yaxis": dict(title='Aggregate Score', range=[0, max_score]),
#             "plot_bgcolor": 'rgba(0,0,0,0)',
#             "paper_bgcolor": 'rgba(0,0,0,0)',
#             "hovermode": 'closest',
#             "legend": {
#                 "x": 0.02,
#                 "y": 0.98,
#                 "bgcolor": 'rgba(255,255,255,0.5)',
#                 "bordercolor": 'rgba(0,0,0,0.5)',
#                 "borderwidth": 2
#             },
#             "shapes": create_gradient_shapes(max_score, safe_limit)
#         }

#         # Fetch survey date
#         survey_date = fetch_survey_date(mr_no)

#         # Check if survey date is available
#         if survey_date != "Unknown":
#             annotation_x = survey_date.strftime("%Y-%m-%d")  # Convert survey date to string in the format "YYYY-MM-DD"
#             annotation_y = 15  # Example annotation y-coordinate

#             # Add annotations
#             annotations = [
#                 dict(
#                     x=annotation_x,
#                     y=annotation_y,
#                     xref="x",
#                     yref="y",
#                     text="Date Of Intervention",
#                     showarrow=True,
#                     arrowhead=7,
#                     ax=0,
#                     ay=-40
#                 )
#             ]

#             layout["annotations"] = annotations

#             # Add vertical line representing the date of surgery
#             layout["shapes"].append({
#                 "type": "line",
#                 "x0": annotation_x,
#                 "y0": 0,
#                 "x1": annotation_x,
#                 "y1": layout["yaxis"]["range"][1],  # Extend the line to the top of the y-axis
#                 "line": {"color": "black", "width": 1, "dash": "dash"}
#             })

#             # Add surgery date to the x-axis tick values
#             if annotation_x not in layout["xaxis"]["tickvals"]:
#                 layout["xaxis"]["tickvals"].append(annotation_x)
#                 layout["xaxis"]["ticktext"].append("Surgery Date")  # Text to display for the surgery date
#         else:
#             print("Survey date not found for the patient.")

#         # Create figure
#         fig = go.Figure(data=data, layout=layout)

#         # Update legend position
#         fig.update_layout(
#             legend=dict(
#                 x=1.02,
#                 y=1,
#                 bgcolor='rgba(255,255,255,0.5)',
#                 bordercolor='rgba(0,0,0,0.5)',
#                 borderwidth=2
#             )
#         )
        
#         # Update axes
#         fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
#         fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

#         # Update figure layout
#         fig.update_layout(
#             autosize=True,
#             margin=dict(l=50, r=50, t=80, b=50),
#             showlegend=True
#         )

#         return fig

#     else:
#         print("No survey data found for the patient.")
#         return None

# # Dash layout
# app.layout = html.Div([
#     dcc.Dropdown(
#         id='survey-dropdown',
#         options=[
#             {'label': 'CCFFIS', 'value': 'CCFFIS'},
#             {'label': 'EPDS', 'value': 'EPDS'},
#             {'label': 'PAID', 'value': 'PAID'},
#             {'label': 'PROMS_10', 'value': 'PROMS_10'}
#         ],
#         value='CCFFIS'
#     ),
#     dcc.Graph(id='survey-graph'),
#     dcc.Input(id='mr-no-input', type='text', value='Enter Mr_no'),
#     html.Button(id='submit-button', n_clicks=0, children='Submit')
# ])

# @app.callback(
#     Output('survey-graph', 'figure'),
#     [Input('submit-button', 'n_clicks')],
#     [dash.dependencies.State('survey-dropdown', 'value'),
#      dash.dependencies.State('mr-no-input', 'value')]
# )
# def update_graph(n_clicks, selected_survey, mr_no):
#     if n_clicks > 0:
#         if selected_survey == 'CCFFIS':
#             safe_limit = 12
#         elif selected_survey == 'EPDS':
#             safe_limit = 12
#         elif selected_survey == 'PAID':
#             safe_limit = 8
#         elif selected_survey == 'PROMS_10':
#             safe_limit = 15  # Adjust this based on actual safe limit for PROMS_10

#         fig = graph_generate(mr_no, safe_limit)
#         return fig

#     return go.Figure()

# if __name__ == "__main__":
#     import sys

#     # Check if Mr_no is provided as a command-line argument
#     if len(sys.argv) > 1:
#         # Get the Mr_no from command-line arguments
#         try:
#             input_value = str(sys.argv[1])
#         except ValueError:
#             print("Invalid input value. Please provide a valid Mr_no.")
#             sys.exit(1)

#         # Call the function with the input value and show the graph
#         fig = graph_generate(input_value, 12)  # Default safe limit
#         if fig:
#             fig.show()
#     else:
#         # Run the Dash server
#         app.run_server(debug=True)



import dash
from dash import dcc, html, Input, Output
import pymongo
from datetime import datetime
import plotly.graph_objs as go
from collections import defaultdict

# Initialize Dash app
app = dash.Dash(__name__)

# Connect to MongoDB
client = pymongo.MongoClient("mongodb://localhost:27017/")  # Update with your MongoDB connection string
db = client["Data_Entry_Incoming"]
collection = db["patient_data"]

# Function to fetch survey responses based on Mr_no and survey type
def fetch_survey_responses(mr_no, survey_type):
    survey_responses = []
    cursor = collection.find({"Mr_no": mr_no, survey_type: {"$exists": True}})
    for response in cursor:
        survey_responses.extend(response[survey_type].values())
    return survey_responses

# Function to aggregate scores for each date
def aggregate_scores_by_date(survey_responses):
    scores_by_date = defaultdict(int)
    date_responses = defaultdict(list)
    for response in survey_responses:
        timestamp = response.get('timestamp')
        date = datetime.strptime(timestamp[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
        scores = [int(score) for key, score in response.items() if key != 'Mr_no' and key != 'timestamp']
        scores_by_date[date] += sum(scores)
        date_responses[date].append(response)
    return scores_by_date, date_responses

# Function to fetch patient name based on Mr_no
def fetch_patient_name(mr_no):
    patient_data = collection.find_one({"Mr_no": mr_no}, {"Name": 1})
    if patient_data:
        return patient_data.get("Name")
    else:
        return "Unknown"

# Function to fetch survey date based on Mr_no
def fetch_survey_date(mr_no):
    survey_data = collection.find_one({"Mr_no": mr_no})
    if survey_data and "dateOfSurgery" in survey_data:
        survey_date = datetime.strptime(survey_data["dateOfSurgery"], "%Y-%m-%d")
        return survey_date
    else:
        return "Unknown"

# Function to create hover text for each point
def create_hover_text(date_responses):
    hover_texts = []
    for date, responses in date_responses.items():
        hover_text = f"<b>Date:</b> {date}<br><br>"
        for response in responses:
            hover_text += "<b>Question:</b> {}<br>".format("<br>".join([f"{key}: {value}" for key, value in response.items() if key != 'Mr_no' and key != 'timestamp']))
        hover_texts.append(hover_text)
    return hover_texts

# Function to create gradient background shapes
def create_gradient_shapes(max_score, safe_limit):
    gradient_steps = 100
    shapes = []

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

# Function to generate the graph
def graph_generate(mr_no, safe_limit):
    # Fetch patient name
    patient_name = fetch_patient_name(mr_no)
    # Fetch survey date
    survey_date = fetch_survey_date(mr_no)
    
    # Fetch CCFFIS survey responses and aggregate scores by date
    ccffis_responses = fetch_survey_responses(mr_no, "CCFFIS")
    ccffis_scores_by_date, ccffis_date_responses = aggregate_scores_by_date(ccffis_responses)

    # Fetch EPDS survey responses and aggregate scores by date
    epds_responses = fetch_survey_responses(mr_no, "EPDS")
    epds_scores_by_date, epds_date_responses = aggregate_scores_by_date(epds_responses)

    # Fetch PAID survey responses and aggregate scores by date
    paid_responses = fetch_survey_responses(mr_no, "PAID")
    paid_scores_by_date, paid_date_responses = aggregate_scores_by_date(paid_responses)

    # Fetch PROMS_10 survey responses and aggregate scores by date
    proms_10_responses = fetch_survey_responses(mr_no, "PROMS_10")
    proms_10_scores_by_date, proms_10_date_responses = aggregate_scores_by_date(proms_10_responses)

    # Combine all dates from all surveys and remove duplicates
    all_dates = list(set(list(ccffis_scores_by_date.keys()) + list(epds_scores_by_date.keys()) + list(paid_scores_by_date.keys()) + list(proms_10_scores_by_date.keys())))
    all_dates.sort()

    # Check if any survey data exists
    if ccffis_scores_by_date or epds_scores_by_date or paid_scores_by_date or proms_10_scores_by_date:
        # Create traces for each survey type if data exists
        data = []

        if ccffis_scores_by_date:
            # Create traces for CCFFIS line plot
            ccffis_scores = [ccffis_scores_by_date[date] for date in all_dates]

            # Create hover text for each point
            ccffis_hover_text = create_hover_text(ccffis_date_responses)

            # Add CCFFIS trace
            data.append(go.Scatter(x=all_dates, y=ccffis_scores, name='Stool incontinence survey', mode='lines+markers',
                                hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=ccffis_hover_text,
                                line=dict(color='rgba(255, 0, 0, 0.7)', width=2),
                                marker=dict(color='rgba(255, 0, 0, 1)', size=8)))

        if epds_scores_by_date:
            # Create traces for EPDS line plot
            epds_scores = [epds_scores_by_date[date] for date in all_dates]

            # Create hover text for each point
            epds_hover_text = create_hover_text(epds_date_responses)

            # Add EPDS trace
            data.append(go.Scatter(x=all_dates, y=epds_scores, name='Mental Health Resilience after pregnancy', mode='lines+markers',
                                hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=epds_hover_text,
                                line=dict(color='rgba(0, 0, 255, 0.7)', width=2),
                                marker=dict(color='rgba(0, 0, 255, 1)', size=8)))

        if paid_scores_by_date:
            # Create traces for PAID line plot
            paid_scores = [paid_scores_by_date[date] for date in all_dates]

            # Create hover text for each point
            paid_hover_text = create_hover_text(paid_date_responses)

            # Add PAID trace
            data.append(go.Scatter(x=all_dates, y=paid_scores, name='PAID Scores', mode='lines+markers',
                                hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=paid_hover_text,
                                line=dict(color='rgba(0, 128, 0, 0.7)', width=2),
                                marker=dict(color='rgba(0, 128, 0, 1)', size=8)))

        if proms_10_scores_by_date:
            # Create traces for PROMS_10 line plot
            proms_10_scores = [proms_10_scores_by_date[date] for date in all_dates]

            # Create hover text for each point
            proms_10_hover_text = create_hover_text(proms_10_date_responses)

            # Add PROMS_10 trace
            data.append(go.Scatter(x=all_dates, y=proms_10_scores, name='PROMS_10', mode='lines+markers',
                                hovertemplate='<b>Score:</b> %{y}<br>%{customdata}', customdata=proms_10_hover_text,
                                line=dict(color='rgba(255, 165, 0, 0.7)', width=2),
                                marker=dict(color='rgba(255, 165, 0, 1)', size=8)))

        # Create layout
        max_score = max(max(ccffis_scores_by_date.values(), default=0), max(epds_scores_by_date.values(), default=0), max(paid_scores_by_date.values(), default=0), max(proms_10_scores_by_date.values(), default=0)) + 5
        layout = {
            "title": f'Mr_no : {mr_no} | Name : {patient_name} | Date Of Intervention : {survey_date}',
            "xaxis": dict(title='Timeline', tickvals=all_dates, ticktext=all_dates),
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
            "shapes": create_gradient_shapes(max_score, safe_limit)
        }

        # Fetch survey date
        survey_date = fetch_survey_date(mr_no)

        # Check if survey date is available
        if survey_date != "Unknown":
            annotation_x = survey_date.strftime("%Y-%m-%d")  # Convert survey date to string in the format "YYYY-MM-DD"
            annotation_y = 15  # Example annotation y-coordinate

            # Add annotations
            annotations = [
                dict(
                    x=annotation_x,
                    y=annotation_y,
                    xref="x",
                    yref="y",
                    text="Date Of Intervention",
                    showarrow=True,
                    arrowhead=7,
                    ax=0,
                    ay=-40
                )
            ]

            layout["annotations"] = annotations

            # Add vertical line representing the date of surgery
            layout["shapes"].append({
                "type": "line",
                "x0": annotation_x,
                "y0": 0,
                "x1": annotation_x,
                "y1": layout["yaxis"]["range"][1],  # Extend the line to the top of the y-axis
                "line": {"color": "black", "width": 1, "dash": "dash"}
            })

            # Add surgery date to the x-axis tick values
            if annotation_x not in layout["xaxis"]["tickvals"]:
                layout["xaxis"]["tickvals"].append(annotation_x)
                layout["xaxis"]["ticktext"].append("Surgery Date")  # Text to display for the surgery date
        else:
            print("Survey date not found for the patient.")

        # Create figure
        fig = go.Figure(data=data, layout=layout)

        # Update legend position
        fig.update_layout(
            legend=dict(
                x=1.02,
                y=1,
                bgcolor='rgba(255,255,255,0.5)',
                bordercolor='rgba(0,0,0,0.5)',
                borderwidth=2
            )
        )
        
        # Update axes
        fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)
        fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='rgba(0,0,0,0.1)', linecolor='rgba(0,0,0,0.5)', ticks='outside', tickwidth=2, ticklen=10)

        # Update figure layout
        fig.update_layout(
            autosize=True,
            margin=dict(l=50, r=50, t=80, b=50),
            showlegend=True
        )

        return fig

    else:
        print("No survey data found for the patient.")
        return None

# Dash layout
app.layout = html.Div([
    dcc.Input(id='mr-no-input', type='text', placeholder='Enter Mr_no'),
    dcc.Dropdown(
        id='survey-dropdown',
        options=[
            {'label': 'CCFFIS', 'value': 'CCFFIS'},
            {'label': 'EPDS', 'value': 'EPDS'},
            {'label': 'PAID', 'value': 'PAID'},
            {'label': 'PROMS_10', 'value': 'PROMS_10'}
        ],
        value='CCFFIS'
    ),
    html.Button(id='submit-button', n_clicks=0, children='Submit'),
    dcc.Graph(id='survey-graph')
])

@app.callback(
    Output('survey-graph', 'figure'),
    [Input('submit-button', 'n_clicks')],
    [dash.dependencies.State('survey-dropdown', 'value'),
     dash.dependencies.State('mr-no-input', 'value')]
)
def update_graph(n_clicks, selected_survey, mr_no):
    if n_clicks > 0:
        if selected_survey == 'CCFFIS':
            safe_limit = 12
        elif selected_survey == 'EPDS':
            safe_limit = 12
        elif selected_survey == 'PAID':
            safe_limit = 8
        elif selected_survey == 'PROMS_10':
            safe_limit = 15  # Adjust this based on actual safe limit for PROMS_10

        fig = graph_generate(mr_no, safe_limit)
        return fig

    return go.Figure()

if __name__ == "__main__":
    import sys

    # Check if Mr_no is provided as a command-line argument
    if len(sys.argv) > 1:
        # Get the Mr_no from command-line arguments
        try:
            input_value = str(sys.argv[1])
        except ValueError:
            print("Invalid input value. Please provide a valid Mr_no.")
            sys.exit(1)

        # Call the function with the input value and show the graph
        fig = graph_generate(input_value, 12)  # Default safe limit
        if fig:
            fig.show()
    else:
        # Run the Dash server
        app.run_server(debug=True)
