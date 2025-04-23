

#This is the code where we are skipping the SurveySent value update when we are skipping the SurveyLink




# from pymongo import MongoClient
# from datetime import datetime, timedelta
# import requests
# import os

# # ------------------------------------------------------------------
# # Config
# # ------------------------------------------------------------------
# MONGO_URI = "mongodb://admin:klmnqwaszx@10.0.2.2:27017/?replicaSet=rs0"
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
#     - If SurveySent > 0, we skip sending (without updating dashboards).
#     - If SurveySent == 0 and an appointment is within 24 hrs, call send_survey_link().
#     """
#     mr_no = document.get("Mr_no")
#     tracker = document.get("appointment_tracker", {})

#     if not mr_no or not tracker:
#         return

#     # NEW: If SurveySent is already > 0, skip sending the survey link.
#     if document.get("SurveySent", 0) > 0:
#         print(f"Survey link already sent for Mr_no {mr_no}. Skipping send.")
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
#     watch_patient_data(client)         # watch new/updates

# # ------------------------------------------------------------------
# if __name__ == "__main__":
#     main()






# -*- coding: utf-8 -*-
from pymongo import MongoClient
from datetime import datetime, timedelta
import requests
import os
import logging # Using logging module for better output control

# ------------------------------------------------------------------
# Setup Logging
# ------------------------------------------------------------------
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:klmnqwaszx@10.0.2.2:27017/?replicaSet=rs0")
SEND_LINK_ENDPOINT = os.getenv(
    "SURVEY_LINK_URL",
    "http://localhost:3051/staff/send-survey-link"
)
# Define the format string for appointment times globally
APPOINTMENT_TIME_FORMAT = "%m/%d/%Y, %I:%M %p"

# ------------------------------------------------------------------
def create_mongo_client(uri: str) -> MongoClient:
    """Creates and returns a MongoDB client instance."""
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000) # Add timeout
        # The ismaster command is cheap and does not require auth.
        client.admin.command('ismaster')
        logging.info("✅ Successfully connected to MongoDB")
        return client
    except Exception as e:
        logging.exception(f"❌ Error connecting to MongoDB: {e}") # Log full exception
        raise

# ------------------------------------------------------------------
def send_survey_link(mr_no: str, client: MongoClient) -> bool:
    """
    1. Calls the Express route to send the survey link.
    2. If successful (HTTP 2xx), increments surveySent in both collections.
    3. Returns True if link sent and counters incremented successfully, False otherwise.
    """
    if not mr_no:
        logging.warning("send_survey_link called with empty Mr_no. Skipping.")
        return False

    try:
        logging.info(f"Attempting to send survey link for Mr_no {mr_no} to {SEND_LINK_ENDPOINT}...")
        resp = requests.post(SEND_LINK_ENDPOINT, json={"Mr_no": mr_no}, timeout=15) # Slightly longer timeout

        if resp.ok: # Checks for status codes 200-299
            logging.info(f"✅📨 Survey link API call successful for Mr_no {mr_no} (Status: {resp.status_code})")

            # --- Start Increment Logic ---
            patient_data_col = client["Data_Entry_Incoming"]["patient_data"]
            dashboards_pretest_col = client["dashboards"]["pretest"]
            success_patient = False
            success_pretest = False

            # Increment in Data_Entry_Incoming.patient_data
            try:
                update_result_patient = patient_data_col.update_one(
                    {"Mr_no": mr_no},
                    {"$inc": {"surveySent": 1}}
                )
                if update_result_patient.matched_count > 0: # Check if doc was found
                     if update_result_patient.modified_count > 0:
                          logging.info(f"✅ Incremented surveySent in patient_data for Mr_no {mr_no}")
                          success_patient = True
                     else:
                          # Found but not modified - could indicate concurrent update or issue
                           logging.warning(f"⚠️ Found patient_data for Mr_no {mr_no} but surveySent not incremented.")
                else:
                    logging.warning(f"⚠️ Could not find patient_data document for Mr_no {mr_no} to increment surveySent.")
            except Exception as e:
                logging.exception(f"❌ Error incrementing surveySent in patient_data for {mr_no}: {e}")


            # Increment in dashboards.pretest (using upsert=True)
            try:
                update_result_pretest = dashboards_pretest_col.update_one(
                    {"patientId": mr_no},
                    {"$inc": {"surveySent": 1}},
                    upsert=True
                )
                if update_result_pretest.modified_count or update_result_pretest.upserted_id:
                     logging.info(f"✅ Incremented/Set surveySent in dashboards.pretest for Mr_no {mr_no}")
                     success_pretest = True
                else:
                    # Less likely with upsert unless race condition prevented the inc on existing doc
                    logging.warning(f"⚠️ Failed to modify/upsert surveySent in dashboards.pretest for Mr_no {mr_no} (Matched: {update_result_pretest.matched_count})")
            except Exception as e:
                 logging.exception(f"❌ Error incrementing/upserting surveySent in dashboards.pretest for {mr_no}: {e}")
            # --- End Increment Logic ---

            return success_patient and success_pretest # Return True only if both increments likely succeeded

        else:
            # Log detailed error from response if possible
            error_detail = resp.text[:500] # Limit error message length
            logging.error(f"⚠️ Failed to send survey link for Mr_no {mr_no}. Status: {resp.status_code}, Response: {error_detail}")
            return False

    except requests.Timeout:
         logging.error(f"❌ Timeout error while sending link for Mr_no {mr_no}")
         return False
    except requests.RequestException as err:
        logging.error(f"❌ HTTP Request error while sending link for Mr_no {mr_no}: {err}")
        return False
    except Exception as e:
        logging.exception(f"❌ Unexpected error during send_survey_link for Mr_no {mr_no}: {e}")
        return False

# ------------------------------------------------------------------
def check_and_send_if_needed(document: dict, client: MongoClient):
    """
    Checks if any appointment in the document is within the next 24 hours.
    If found, calls send_survey_link(). This function IGNORES surveySent count.
    """
    mr_no = document.get("Mr_no")
    tracker = document.get("appointment_tracker", {})

    if not mr_no:
        logging.warning("Document missing Mr_no in check_and_send_if_needed. Skipping.")
        return
    if not tracker:
        logging.debug(f"No appointment_tracker found for Mr_no {mr_no}. Skipping check.")
        return

    now = datetime.now()
    tomorrow = now + timedelta(days=1)
    found_appointment_soon = False
    appointment_details = ""

    for speciality, appointments in tracker.items():
        if not isinstance(appointments, list):
            logging.warning(f"Expected list for appointments in speciality '{speciality}' for Mr_no {mr_no}, got {type(appointments)}. Skipping speciality.")
            continue

        for idx, appt in enumerate(appointments): # Use enumerate if index needed for logging
            if not isinstance(appt, dict):
                logging.warning(f"Expected dict for appointment entry {idx} in speciality '{speciality}' for Mr_no {mr_no}, got {type(appt)}. Skipping entry.")
                continue

            appt_time_str = appt.get("appointment_time")
            if not appt_time_str:
                continue # Skip entries without time

            try:
                appt_time = datetime.strptime(appt_time_str, APPOINTMENT_TIME_FORMAT)
            except ValueError:
                logging.warning(f"Bad date format '{appt_time_str}' in appointment_time ({speciality}[{idx}]) for Mr_no {mr_no}. Skipping entry.")
                continue

            # Check if the appointment is in the future but within the next 24 hours
            if now < appt_time <= tomorrow:
                logging.info(f"📢 Appointment within 24h found for Mr_no {mr_no} (Speciality: {speciality}, Time: {appt_time_str})")
                found_appointment_soon = True
                appointment_details = f"Speciality: {speciality}, Time: {appt_time_str}"
                break # Exit inner loop once a valid appointment is found

        if found_appointment_soon:
            break # Exit outer loop as well

    if found_appointment_soon:
        logging.info(f"   -> Triggering survey link send for Mr_no {mr_no} due to upcoming appointment: {appointment_details}")
        send_survey_link(mr_no, client)
    else:
        logging.debug(f"No upcoming appointments found within 24h for Mr_no {mr_no} in this check.")


# ------------------------------------------------------------------
def check_existing_records(client: MongoClient):
    """
    Scans existing patient records ONCE at startup and checks for appointments
    within the next 24 hours, triggering send_survey_link if found,
    regardless of surveySent value.
    """
    logging.info(f"📂 Scanning existing patient records at startup...")
    collection = client["Data_Entry_Incoming"]["patient_data"]
    count = 0
    sent_count = 0
    try:
        # Consider adding projection if documents are large and only tracker/Mr_no needed
        cursor = collection.find({}, {"Mr_no": 1, "appointment_tracker": 1})
        for document in cursor:
            # Check if appointment is soon, send link if needed
            # NOTE: This check is now done by check_and_send_if_needed called inside the loop
            check_and_send_if_needed(document, client) # Reusing the logic
            count += 1
            if count % 1000 == 0: # Log progress for large collections
                logging.info(f"  ...scanned {count} existing records...")

        logging.info(f"✅ Finished scanning {count} existing records.")
    except Exception as e:
        logging.exception(f"❌ Error during initial scan of existing records: {e}")
    finally:
        if 'cursor' in locals() and cursor and hasattr(cursor, 'close'):
            cursor.close()

# ------------------------------------------------------------------
def watch_patient_data(client: MongoClient):
    """
    Watches for inserts and specific updates (to appointment_time)
    in the patient_data collection and triggers checks.
    """
    logging.info(f"👀 Watching patient_data collection for inserts and appointment_time updates...")
    collection = client["Data_Entry_Incoming"]["patient_data"]

    try:
        # Watch for inserts and updates, get the full document after update
        pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
        with collection.watch(pipeline, full_document="updateLookup") as stream:
            for change in stream:
                operation_type = change.get("operationType")
                full_doc = change.get("fullDocument")
                doc_id = change.get("documentKey", {}).get("_id")
                mr_no = full_doc.get("Mr_no", "N/A") if full_doc else "N/A (no fullDoc)"

                logging.debug(f"⚡ Change detected (Type: {operation_type}, ID: {doc_id}, Mr_no: {mr_no})")

                if not full_doc:
                     logging.warning(f"⚠️ Change detected (Type: {operation_type}, ID: {doc_id}), but full document not retrieved. Cannot process.")
                     continue # Skip if we don't have the document data

                if operation_type == "insert":
                    logging.info(f"Processing INSERT for Mr_no: {mr_no} (ID: {doc_id})")
                    check_and_send_if_needed(full_doc, client)

                elif operation_type == "update":
                    update_desc = change.get("updateDescription")
                    if not update_desc:
                        logging.warning(f"Update event for Mr_no: {mr_no} (ID: {doc_id}) missing 'updateDescription'. Skipping detailed check.")
                        continue

                    updated_fields = update_desc.get("updatedFields", {})
                    appointment_time_updated = False
                    updated_field_list = [] # For logging

                    for key in updated_fields.keys():
                        # Check if the key path looks like an appointment_time within the tracker
                        # Example key: "appointment_tracker.Cardiology.0.appointment_time"
                        parts = key.split('.')
                        if len(parts) >= 3 and parts[0] == "appointment_tracker" and parts[-1] == "appointment_time":
                             # Basic check: key starts with tracker and ends with time
                             # More robust check could involve checking if parts[2] is an integer index
                            try:
                                # Check if the middle part(s) could represent array index(es)
                                # This is a heuristic, might need adjustment based on exact structure
                                is_index_part = all(p.isdigit() for p in parts[2:-1])
                                if parts[1] and is_index_part: # Check speciality exists and index part is valid
                                     appointment_time_updated = True
                                     updated_field_list.append(key)
                                     # Don't break here, log all updated time fields
                            except Exception:
                                 # Handle potential errors if key format is unexpected
                                 logging.debug(f"Could not parse update key '{key}' fully for index check.")
                                 pass # Continue checking other keys


                    if appointment_time_updated:
                        logging.info(f"Processing UPDATE for Mr_no: {mr_no} (ID: {doc_id}) - Detected update to appointment_time fields: {updated_field_list}")
                        check_and_send_if_needed(full_doc, client)
                    else:
                        logging.debug(f"Update for Mr_no: {mr_no} (ID: {doc_id}) did not include changes to 'appointment_time' fields. Skipping send check.")

    except Exception as e: # Catching PyMongoError specifically might be better
        logging.exception(f"❌ Change stream error: {e}")
        # Consider adding retry logic or specific error handling here
    logging.info("🛑 Watch stream stopped.")

# ------------------------------------------------------------------
def main():
    """Main execution function."""
    logging.info("🚀 Script starting up...")
    try:
        client = create_mongo_client(MONGO_URI)
        check_existing_records(client)   # Scan existing records once at start
        watch_patient_data(client)       # Watch for relevant inserts/updates
    except Exception as e:
        # Error during client creation or initial connection handled in create_mongo_client
        # This catches errors during scan or watch setup/execution
        logging.critical(f"❌ Critical error preventing script execution: {e}", exc_info=True)
    finally:
        logging.info("🏁 Script finished or encountered a critical error.")
        # Clean up client connection if necessary, although usually not needed for long-running watchers
        # if 'client' in locals() and client:
        #    client.close()
        #    logging.info("MongoDB connection closed.")

# ------------------------------------------------------------------
if __name__ == "__main__":
    main()