# from pymongo import MongoClient
# from datetime import datetime, timedelta


# def create_mongo_client(connection_string: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(connection_string)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         return None


# def check_appointments(document: dict):
#     mr_no = document.get("Mr_no", "Unknown")
#     tracker = document.get("appointment_tracker", {})

#     if not tracker:
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if appt_time_str:
#                 try:
#                     appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#                     if now < appt_time <= tomorrow:
#                         print(f"📢 Hello, you have an appointment tomorrow (Mr_no: {mr_no})")
#                 except ValueError:
#                     print(f"⚠️ Invalid date format in appointment_time for Mr_no {mr_no}")


# def check_existing_records(client: MongoClient):
#     print("📂 Checking existing patient records for upcoming appointments...")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     cursor = collection.find({})
#     for document in cursor:
#         check_appointments(document)


# def watch_patient_data(client: MongoClient):
#     print("👀 Watching for new inserts in real-time...")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         with collection.watch([{"$match": {"operationType": "insert"}}]) as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc)
#     except Exception as e:
#         print(f"❌ Error watching change stream: {e}")


# def main():
#     MONGO_URI = "mongodb://localhost:27017/?replicaSet=rs0"
#     client = create_mongo_client(MONGO_URI)

#     # Step 1: Check already existing records for 24hr appointments
#     check_existing_records(client)

#     # Step 2: Listen for new incoming records
#     watch_patient_data(client)


# if __name__ == "__main__":
#     main()





# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests                     # <-- NEW
# import os                           # <-- NEW (optional for env vars)

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI          = "mongodb://localhost:27017/?replicaSet=rs0"
# # URL of the Express route you added earlier
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"   # adjust port/basePath if different
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise


# # ----------------------------- NEW --------------------------------
# def send_survey_link(mr_no: str) -> None:
#     """Call the Node/Express route that emails/SMSes the survey link."""
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨  Survey link sent for Mr_no {mr_no}")
#         else:
#             print(f"⚠️  Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")
# # ------------------------------------------------------------------


# def check_appointments(document: dict):
#     mr_no   = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     now      = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue
#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️  Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no)          # <-- NEW
#                 return                           # One link per patient is enough


# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document)


# def watch_patient_data(client: MongoClient):
#     print("👀 Watching new inserts in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": "insert"}}]
#         with collection.watch(pipeline) as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")


# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)   # initial scan
#     watch_patient_data(client)       # stay alive & reactive


# if __name__ == "__main__":
#     main()





# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb://localhost:27017/?replicaSet=rs0"
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"   # adjust if different
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Call the Node/Express route to send the survey link.
#     2. If successful, retrieve SurveySent from Data_Entry_Incoming.patient_data.
#     3. Upsert that value into dashboards.pretest, matching on patientId = mr_no.
#     """
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨 Survey link sent for Mr_no {mr_no}")

#             # ✅ 2. Retrieve SurveySent from 'patient_data'
#             patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#             patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
#             if not patient_doc:
#                 print(f"⚠️  No patient_data doc found for Mr_no {mr_no}, skipping dashboard update.")
#                 return

#             # If 'SurveySent' doesn't exist, default to 0
#             survey_sent_value = patient_doc.get("SurveySent", 0)

#             # ✅ 3. Upsert into dashboards.pretest
#             dashboards_pretest = client["dashboards"]["pretest"]
#             # We'll match on patientId = mr_no
#             result = dashboards_pretest.update_one(
#                 {"patientId": mr_no},
#                 {"$set": {"SurveySent": survey_sent_value}},
#                 upsert=True
#             )
#             if result.upserted_id or result.modified_count:
#                 print(f"✅ Updated pretest doc for Mr_no {mr_no} with SurveySent={survey_sent_value}")
#             else:
#                 print(f"⚠️  No changes made in pretest for Mr_no {mr_no}")

#         else:
#             print(f"⚠️  Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# # ------------------------------------------------------------------
# def check_appointments(document: dict, client: MongoClient):
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue
#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️  Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no, client)
#                 return  # One link per patient is enough

# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document, client)

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     print("👀 Watching new inserts in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": "insert"}}]
#         with collection.watch(pipeline) as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc, client)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")

# # ------------------------------------------------------------------
# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)   # initial scan of existing docs
#     watch_patient_data(client)       # remain alive & watch for new inserts

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()





# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests                     # for sending HTTP requests to Express route
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb://localhost:27017/?replicaSet=rs0"
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"   # adjust port/basePath if different
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Calls the Express route to send the survey link.
#     2. If the send is successful, then it reads the SurveySent field from 
#        the patient_data collection and upserts it into dashboards.pretest.
#     """
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨 Survey link sent for Mr_no {mr_no}")
            
#             # Retrieve the patient's SurveySent value from the patient_data collection
#             patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#             patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
#             if not patient_doc:
#                 print(f"⚠️ No patient_data document found for Mr_no {mr_no}.")
#                 return
#             survey_sent_value = patient_doc.get("SurveySent", 0)
  
#             # Upsert this value into the dashboards.pretest collection
#             dashboards_pretest = client["dashboards"]["pretest"]
#             result = dashboards_pretest.update_one(
#                 {"patientId": mr_no},
#                 {"$set": {"SurveySent": survey_sent_value}},
#                 upsert=True
#             )
#             if result.upserted_id or result.modified_count:
#                 print(f"✅ Updated dashboards.pretest for Mr_no {mr_no} with SurveySent={survey_sent_value}")
#             else:
#                 print(f"⚠️ No changes made in dashboards.pretest for Mr_no {mr_no}")
#         else:
#             print(f"⚠️ Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# # ------------------------------------------------------------------
# def check_appointments(document: dict, client: MongoClient):
#     """Checks the appointment_tracker for any appointment within the next 24 hours."""
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     # Loop over every speciality's appointments
#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue
#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️ Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no, client)
#                 return  # Only one link per patient
          
# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document, client)

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watches the patient_data collection for both insert and update events.
#     Using fullDocument: 'updateLookup' to retrieve the updated document.
#     """
#     print("👀 Watching new inserts/updates in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc, client)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")

# # ------------------------------------------------------------------
# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)  # initial scan of existing documents
#     watch_patient_data(client)        # remain active & monitor for new changes

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()



# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests  # For sending HTTP requests
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb://localhost:27017/?replicaSet=rs0"
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"  # adjust port/basePath if different
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Call the Express route that sends the survey link.
#     2. On successful send, read the SurveySent value from the
#        patient_data collection and upsert/update it into dashboards.pretest.
#     """
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨 Survey link sent for Mr_no {mr_no}")

#             # Retrieve the current SurveySent value from patient_data
#             patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#             patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
#             if not patient_doc:
#                 print(f"⚠️ No patient_data document found for Mr_no {mr_no}.")
#                 return
#             survey_sent_value = patient_doc.get("SurveySent", 0)

#             # Upsert this value into dashboards.pretest (matching on patientId)
#             dashboards_pretest = client["dashboards"]["pretest"]
#             result = dashboards_pretest.update_one(
#                 {"patientId": mr_no},
#                 {"$set": {"SurveySent": survey_sent_value}},
#                 upsert=True
#             )
#             if result.upserted_id or result.modified_count:
#                 print(f"✅ Updated dashboards.pretest for Mr_no {mr_no} with SurveySent={survey_sent_value}")
#             else:
#                 print(f"⚠️ No changes made in dashboards.pretest for Mr_no {mr_no}")
#         else:
#             print(f"⚠️ Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# # ------------------------------------------------------------------
# def check_appointments(document: dict, client: MongoClient):
#     """
#     Check the appointment_tracker in the document for any appointment
#     within the next 24 hours. If found and the SurveySent value is 0,
#     trigger sending the survey link.
#     """
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     # NEW: Check if survey link is already sent for this Mr_no.
#     if document.get("SurveySent", 0) > 0:
#         print(f"Survey link already sent for Mr_no {mr_no}. Skipping.")
#         return

#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue
#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️ Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no, client)
#                 return  # Trigger once for that Mr_no

# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document, client)

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watch the patient_data collection for both inserts and updates.
#     fullDocument is set to 'updateLookup' to ensure the updated document is returned.
#     """
#     print("👀 Watching new inserts/updates in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc, client)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")

# # ------------------------------------------------------------------
# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)  # Process pre-existing documents
#     watch_patient_data(client)        # Remain active and monitor changes

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()










#This is new code with good handler


# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb://localhost:27017/?replicaSet=rs0"
# SEND_LINK_ENDPOINT = os.getenv(
#     "SURVEY_LINK_URL",
#     "http://localhost:3051/staff/send-survey-link"  # adjust if needed
# )

# # ------------------------------------------------------------------
# def create_mongo_client(uri: str) -> MongoClient:
#     try:
#         print("✅ Connected to MongoDB")
#         return MongoClient(uri)
#     except Exception as e:
#         print(f"❌ Error connecting to MongoDB: {e}")
#         raise

# # ------------------------------------------------------------------
# def upsert_survey_sent(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Read the doc from Data_Entry_Incoming.patient_data (by Mr_no).
#     2. Get 'SurveySent' (defaults to 0 if missing).
#     3. Upsert that value into dashboards.pretest (matching on patientId).
#     """
#     patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
#     dashboards_pretest = client["dashboards"]["pretest"]

#     patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
#     if not patient_doc:
#         print(f"⚠️  No patient_data document found for Mr_no {mr_no}. Cannot upsert SurveySent.")
#         return

#     survey_sent_value = patient_doc.get("SurveySent", 0)
#     result = dashboards_pretest.update_one(
#         {"patientId": mr_no},
#         {"$set": {"SurveySent": survey_sent_value}},
#         upsert=True
#     )

#     if result.upserted_id or result.modified_count:
#         print(f"✅ Upserted SurveySent={survey_sent_value} into dashboards.pretest for Mr_no {mr_no}")
#     else:
#         print(f"⚠️  No changes made in dashboards.pretest for Mr_no {mr_no}")

# # ------------------------------------------------------------------
# def send_survey_link(mr_no: str, client: MongoClient) -> None:
#     """
#     1. Call the Express route to send the survey link.
#     2. If successful, then upsert the SurveySent value into dashboards.pretest.
#     """
#     try:
#         resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
#         if resp.ok:
#             print(f"📨 Survey link sent for Mr_no {mr_no}")
#             # After a successful send, ensure dashboards.pretest is up to date
#             upsert_survey_sent(mr_no, client)
#         else:
#             print(f"⚠️  Failed to send survey link for {mr_no}: {resp.text}")
#     except requests.RequestException as err:
#         print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# # ------------------------------------------------------------------
# def check_appointments(document: dict, client: MongoClient):
#     """
#     Checks the appointment_tracker for any appointment in the next 24 hours.
#     - If SurveySent > 0 => skip sending, but still upsert SurveySent into dashboards.pretest.
#     - If SurveySent=0 and an appointment is within 24 hrs => call send_survey_link().
#     """
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     # If SurveySent is already > 0, we skip sending but still update dashboards
#     if document.get("SurveySent", 0) > 0:
#         print(f"Survey link already sent for Mr_no {mr_no}. Skipping send, but updating dashboards.")
#         upsert_survey_sent(mr_no, client)  # Make sure dashboards.pretest is in sync
#         return

#     # Otherwise, check if any appointment is within the next 24 hours
#     now = datetime.now()
#     tomorrow = now + timedelta(days=1)

#     for speciality, appointments in tracker.items():
#         for appt in appointments:
#             appt_time_str = appt.get("appointment_time")
#             if not appt_time_str:
#                 continue

#             try:
#                 appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
#             except ValueError:
#                 print(f"⚠️  Bad date format in appointment_time for Mr_no {mr_no}")
#                 continue

#             if now < appt_time <= tomorrow:
#                 print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
#                 send_survey_link(mr_no, client)
#                 return  # Only trigger once for this Mr_no

# # ------------------------------------------------------------------
# def check_existing_records(client: MongoClient):
#     print("📂 Scanning existing patient records …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     for document in collection.find({}):
#         check_appointments(document, client)

# # ------------------------------------------------------------------
# def watch_patient_data(client: MongoClient):
#     """
#     Watch for both inserts and updates in patient_data, returning the updated doc.
#     """
#     print("👀 Watching new inserts/updates in real‑time …")
#     collection = client["Data_Entry_Incoming"]["patient_data"]
#     try:
#         pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
#         with collection.watch(pipeline, full_document="updateLookup") as stream:
#             for change in stream:
#                 full_doc = change.get("fullDocument")
#                 if full_doc:
#                     check_appointments(full_doc, client)
#     except Exception as e:
#         print(f"❌ Change‑stream error: {e}")

# # ------------------------------------------------------------------
# def main():
#     client = create_mongo_client(MONGO_URI)
#     check_existing_records(client)   # handle old records
#     watch_patient_data(client)       # watch new/updates

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()







#This is the code where we are skipping the SurveySent value update when we are skipping the SurveyLink




from pymongo import MongoClient
from datetime import datetime, timedelta
import requests
import os

# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
MONGO_URI = "mongodb://localhost:27017/?replicaSet=rs0"
SEND_LINK_ENDPOINT = os.getenv(
    "SURVEY_LINK_URL",
    "http://localhost:3051/staff/send-survey-link"  # adjust if needed
)

# ------------------------------------------------------------------
def create_mongo_client(uri: str) -> MongoClient:
    try:
        print("✅ Connected to MongoDB")
        return MongoClient(uri)
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        raise

# ------------------------------------------------------------------
def upsert_survey_sent(mr_no: str, client: MongoClient) -> None:
    """
    1. Read the doc from Data_Entry_Incoming.patient_data (by Mr_no).
    2. Get 'SurveySent' (defaults to 0 if missing).
    3. Upsert that value into dashboards.pretest (matching on patientId).
    """
    patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
    dashboards_pretest = client["dashboards"]["pretest"]

    patient_doc = patient_data_col.find_one({"Mr_no": mr_no})
    if not patient_doc:
        print(f"⚠️  No patient_data document found for Mr_no {mr_no}. Cannot upsert SurveySent.")
        return

    survey_sent_value = patient_doc.get("SurveySent", 0)
    result = dashboards_pretest.update_one(
        {"patientId": mr_no},
        {"$set": {"SurveySent": survey_sent_value}},
        upsert=True
    )

    if result.upserted_id or result.modified_count:
        print(f"✅ Upserted SurveySent={survey_sent_value} into dashboards.pretest for Mr_no {mr_no}")
    else:
        print(f"⚠️  No changes made in dashboards.pretest for Mr_no {mr_no}")

# ------------------------------------------------------------------
def send_survey_link(mr_no: str, client: MongoClient) -> None:
    """
    1. Call the Express route to send the survey link.
    2. If successful, then upsert the SurveySent value into dashboards.pretest.
    """
    try:
        resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=10)
        if resp.ok:
            print(f"📨 Survey link sent for Mr_no {mr_no}")
            # After a successful send, ensure dashboards.pretest is up to date
            upsert_survey_sent(mr_no, client)
        else:
            print(f"⚠️  Failed to send survey link for {mr_no}: {resp.text}")
    except requests.RequestException as err:
        print(f"❌ HTTP error while sending link for {mr_no}: {err}")

# ------------------------------------------------------------------
def check_appointments(document: dict, client: MongoClient):
    """
    Checks the appointment_tracker for any appointment in the next 24 hours.
    - If SurveySent > 0, we skip sending (without updating dashboards).
    - If SurveySent == 0 and an appointment is within 24 hrs, call send_survey_link().
    """
    mr_no = document.get("Mr_no")
    tracker = document.get("appointment_tracker", {})

    if not mr_no or not tracker:
        return

    # NEW: If SurveySent is already > 0, skip sending the survey link.
    if document.get("SurveySent", 0) > 0:
        print(f"Survey link already sent for Mr_no {mr_no}. Skipping send.")
        return

    now = datetime.now()
    tomorrow = now + timedelta(days=1)

    for speciality, appointments in tracker.items():
        for appt in appointments:
            appt_time_str = appt.get("appointment_time")
            if not appt_time_str:
                continue

            try:
                appt_time = datetime.strptime(appt_time_str, "%m/%d/%Y, %I:%M %p")
            except ValueError:
                print(f"⚠️  Bad date format in appointment_time for Mr_no {mr_no}")
                continue

            if now < appt_time <= tomorrow:
                print(f"📢 Appointment within 24 h for Mr_no {mr_no} — sending survey link …")
                send_survey_link(mr_no, client)
                return  # Only trigger once for this Mr_no

# ------------------------------------------------------------------
def check_existing_records(client: MongoClient):
    print("📂 Scanning existing patient records …")
    collection = client["Data_Entry_Incoming"]["patient_data"]
    for document in collection.find({}):
        check_appointments(document, client)

# ------------------------------------------------------------------
def watch_patient_data(client: MongoClient):
    """
    Watch for both inserts and updates in patient_data, returning the updated doc.
    """
    print("👀 Watching new inserts/updates in real‑time …")
    collection = client["Data_Entry_Incoming"]["patient_data"]
    try:
        pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
        with collection.watch(pipeline, full_document="updateLookup") as stream:
            for change in stream:
                full_doc = change.get("fullDocument")
                if full_doc:
                    check_appointments(full_doc, client)
    except Exception as e:
        print(f"❌ Change‑stream error: {e}")

# ------------------------------------------------------------------
def main():
    client = create_mongo_client(MONGO_URI)
    check_existing_records(client)   # handle old records
    watch_patient_data(client)         # watch new/updates

# ------------------------------------------------------------------
if __name__ == "__main__":
    main()

