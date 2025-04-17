

#This is the code where we are skipping the SurveySent value update when we are skipping the SurveyLink




from pymongo import MongoClient
from datetime import datetime, timedelta
import requests
import os

# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
MONGO_URI = "mongodb://admin:klmnqwaszx@10.0.2.2:27017/?replicaSet=rs0"
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

