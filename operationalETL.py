from pymongo import MongoClient
import time
from typing import Dict, List, Optional, Any
from dateutil.parser import isoparse
from datetime import datetime
from collections import defaultdict

def create_mongo_client(connection_string: str) -> MongoClient:
    try:
        print("Connected to MongoDB")
        return MongoClient(connection_string)
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

def get_document(client: MongoClient, db_name: str, collection_name: str, query: dict) -> dict:
    try:
        db = client[db_name]
        collection = db[collection_name]
        return collection.find_one(query)
    except Exception as e:
        print(f"Error getting document: {e}")
        return None

def get_hospital_info(client: MongoClient, hospital_code: str) -> tuple[str, Dict]:
    try:
        hospital = get_document(client, 'adminUser', 'hospitals', {'hospital_code': hospital_code})
        return hospital['hospital_name'], hospital['sites']
    except Exception as e:
        print(f"Error getting hospital information: {e}")
        return None, None

def find_site_name(sites: List[Dict], site_code: str) -> str:
    try:
        return next(
            (site['site_name'] for site in sites if site['site_code'] == site_code),
            'Unknown Site'
        )
    except Exception as e:
        print(f"Error finding site name: {e}")

def get_patient_name(document: Dict) -> str:
    try:
        return f"{document['firstName']} {document['lastName']}"
    except Exception as e:
        print(f"Error getting patient name: {e}")

def find_latest_record(records: List[Dict], date_field: str, date_format: str) -> Dict:
    current_time = datetime.now()
    
    def get_time_diff(record: Dict) -> float:
        parsed_time = datetime.strptime(record[date_field], date_format)
        return abs((parsed_time - current_time).total_seconds())
    
    return min(records, key=get_time_diff)

def get_instrument_survey_type(survey_entry: str) -> tuple[str, str]:
    try:
        instrument, number = survey_entry.split('_')
        survey_type = "Baseline" if number == "0" else f"Follow-up {number}"
        return instrument, survey_type
    except Exception as e:
        print(f"Error getting instrument and survey type: {e}")

def adjust_proms_and_scale(proms_instrument: str) -> tuple[str, Optional[str]]:
    if "Global-Health Physical" in proms_instrument:
        return "Global Health", "Global Physical Health"
    elif "Global-Health Mental" in proms_instrument:
        return "Global Health", "Global Mental Health"
    return proms_instrument, None

def process_all_health_scores(document: Dict) -> List[Dict]:
    """
    Modified so that:
    - If months_since_baseline == 1 => surveyType = 'Baseline'
    - For subsequent entries of the same promsInstrument (any months_since_baseline != 1),
      we assign Follow-up 1, Follow-up 2, etc. in ascending order as they appear
      *for that specific promsInstrument*.
    """
    try:
        results = []
        
        def get_appointment_sent_time(document: Dict, speciality: str, survey_type: str):
            appointment_tracker = document.get('appointment_tracker', {})
            if not isinstance(appointment_tracker, dict):
                print("appointment_tracker is not a dict.")
                return None

            appts_for_spec = appointment_tracker.get(speciality, [])
            if not isinstance(appts_for_spec, list):
                print(f"appointment_tracker[{speciality}] is not a list.")
                return None

            for appt in appts_for_spec:
                if appt.get('surveyType') == survey_type:
                    return datetime.strptime(
                        appt['appointment_time'], "%m/%d/%Y, %I:%M %p"
                    )
            return None

        from collections import defaultdict
        grouped_scores = defaultdict(list)
        for survey in document['SurveyData']['patient_health_scores']:
            grouped_scores[survey['trace_name']].append(survey)

        for trace_name, surveys in grouped_scores.items():
            surveys.sort(key=lambda x: x['months_since_baseline'])

            followup_count = 1
            for survey in surveys:
                proms_instrument, scale = adjust_proms_and_scale(trace_name)

                # Decide surveyType
                if survey['months_since_baseline'] == 1:
                    survey_type = "Baseline"
                else:
                    survey_type = f"Follow-up {followup_count}"
                    followup_count += 1

                # Use `survey['date']` as the received time
                survey_received_str = survey.get("date")
                if survey_received_str:
                    try:
                        received_time = datetime.strptime(survey_received_str, "%Y-%m-%d")
                    except ValueError:
                        received_time = datetime.now()
                else:
                    received_time = datetime.now()

                sent_time_value = get_appointment_sent_time(
                    document, document['speciality'], survey_type
                ) or datetime.now()

                result = {
                    'promsInstrument': proms_instrument,
                    'surveyType': survey_type,
                    'score': survey['score'],
                    'scale': scale,
                    'received_time': received_time,
                    'sent_time': sent_time_value
                }
                results.append(result)

        return results
    except Exception as e:
        print(f"Error processing all health scores: {e}")
        return []

def find_mcid_document(client: MongoClient, patient_id: str, proms_instrument: str, 
                       scale: Optional[str], survey_type: str) -> Optional[Dict]:
    base_query = {
        'patientId': patient_id,
        'promsInstrument': proms_instrument,
        'surveyType': survey_type
    }
    
    # Try first with scale
    if scale is not None:
        try:
            doc = client['dashboards']['test'].find_one({**base_query, 'scale': scale})
            if doc:
                return doc
        except:
            pass  # fall through to try without scale
    
    # Try without scale if first attempt failed or scale was None
    return client['dashboards']['test'].find_one(base_query)

def get_latest_icd_description(codes: List[Dict]) -> Optional[str]:
    if not codes:
        return None
    latest = find_latest_record(codes, 'date', "%Y-%m-%d")
    return latest.get('description')

def calculate_mcid(client: MongoClient, patient_id: str, proms_instrument: str, 
                   scale: str, survey_type: str, current_score: float) -> Optional[int]:
    """
    Custom MCID logic:
    - Only apply for 'Global Health'.
    - If Baseline => None.
    - Compare with Baseline:
       if (current - baseline) > 0 => 1
       else => 0
    """
    try:
        # Only Global Health uses MCID
        if proms_instrument != "Global Health":
            return None

        # No MCID for Baseline
        if survey_type == "Baseline":
            return None

        # Find the baseline doc
        baseline_record = find_mcid_document(
            client,
            patient_id,
            proms_instrument,
            scale,
            "Baseline"
        )
        if baseline_record and 'score' in baseline_record:
            difference = current_score - baseline_record['score']
            return 1 if difference > 0 else 0
        else:
            return None

    except Exception as e:
        print(f"Error calculating MCID: {e}")
        return None

def create_dashboard_entry(
    hospital_info: Dict[str, str],
    doctor_info: Dict[str, str],
    patient_info: Dict[str, str],
    clinical_info: Dict[str, Any],
    survey_info: Dict[str, str],
    result: Dict[str, Any]
) -> Dict:
    try:
        entry = {
            **hospital_info,
            **doctor_info,
            **patient_info,
            **clinical_info,
            **survey_info,
            'scale': result['scale'],
            'score': result['score'],
            'surveySentDate': result['sent_time'],
            'surveyReceivedDate': result['received_time']
        }
        
        # If we already placed 'mcid' in result, set it now
        if 'mcid' in result:
            entry['mcid'] = result['mcid']
        
        return entry
    except Exception as e:
        print(f"Error creating dashboard entry: {e}")

###############################################################################
# NEW FUNCTIONS: Matching ICD codes and Events by month/year of the survey date
###############################################################################
def get_icd_for_month(codes: List[Dict], survey_date: datetime) -> Optional[str]:
    """
    Return the 'description' from the first code whose month/year
    matches the month/year of survey_date. If no match, return None.
    """
    survey_month_year = (survey_date.year, survey_date.month)
    for code in codes:
        try:
            code_date = datetime.strptime(code['date'], "%Y-%m-%d")
            code_month_year = (code_date.year, code_date.month)
            if code_month_year == survey_month_year:
                return code.get('description')
        except Exception as e:
            print(f"Error parsing code date: {e}")
    return None

def get_event_for_month(events: List[Dict], survey_date: datetime) -> Optional[Dict]:
    """
    Return the first event dict whose month/year matches the month/year
    of survey_date. If no match, return None.
    """
    survey_month_year = (survey_date.year, survey_date.month)
    for ev in events:
        try:
            ev_date = datetime.strptime(ev['date'], "%Y-%m-%d")
            ev_month_year = (ev_date.year, ev_date.month)
            if ev_month_year == survey_month_year:
                return ev  # return the entire event dict
        except Exception as e:
            print(f"Error parsing event date: {e}")
    return None
###############################################################################

def main(Mr_no: str):
    # Configuration
    MONGO_URI = 'mongodb://admin:klmnqwaszx@10.0.2.2:27017/'
    client = create_mongo_client(MONGO_URI)
    
    # Get initial patient document
    document = get_document(client, 'Data_Entry_Incoming', 'patient_data', {'Mr_no': Mr_no})
    if not document:
        print(f"No document found for {Mr_no}")
        return

    # Get hospital information
    hospital_name, sites = get_hospital_info(client, document['hospital_code'])
    site_name = find_site_name(sites, document['site_code'])
    
    # Get latest doctor and clinical information
    latest_speciality = find_latest_record(document['specialities'], 'timestamp', "%m/%d/%Y, %I:%M %p")
    latest_event = None
    if 'Events' in document and document['Events']:
        latest_event = find_latest_record(document['Events'], 'date', "%Y-%m-%d")
    
    # Process all survey data for patient health scores
    all_survey_results = process_all_health_scores(document)
    
    # Prepare common information dictionaries
    hospital_info = {
        'hospitalId': document['hospital_code'],
        'hospitalName': hospital_name,
        'siteId': document['site_code'],
        'siteName': site_name
    }
    
    doctor_info = {
        'doctorId': latest_speciality['doctor_ids'][0],
        'departmentName': document['speciality']
    }
    
    patient_info = {
        'patientId': document['Mr_no'],
        'patientName': get_patient_name(document)
    }
    
    clinical_info = {
        # We'll assign 'intervention' per survey below
        'treatmentPlan': latest_event['treatment_plan'] if latest_event else None
    }
    
    # Prepare the collection
    collection = client['dashboards']['test']

    # Now insert each survey individually, then update MCID if needed
    for survey_result in all_survey_results:
        proms_instrument = survey_result['promsInstrument']
        survey_type = survey_result['surveyType']
        current_score = survey_result['score']
        
        # Match ICD code for this survey's month/year
        icd_description = get_icd_for_month(
            document.get('Codes', []),
            survey_result['received_time']
        )

        # Match event for this survey's month/year
        matching_event = get_event_for_month(
            document.get('Events', []),
            survey_result['received_time']
        )
        
        # Build a custom clinical_info for this survey
        updated_clinical_info = {
            **clinical_info,
            'diagnosisICD10': icd_description,
            'intervention': matching_event['event'] if matching_event else None
        }

        # Create the entry without MCID
        entry = create_dashboard_entry(
            hospital_info,
            doctor_info,
            patient_info,
            updated_clinical_info,
            {
                'promsInstrument': proms_instrument,
                'surveyType': survey_type
            },
            survey_result
        )

        # 1) Check if an equivalent record already exists by excluding dynamic datetime fields.
        duplicate_query = {
            'hospitalId': entry['hospitalId'],
            'hospitalName': entry['hospitalName'],
            'siteId': entry['siteId'],
            'siteName': entry['siteName'],
            'doctorId': entry['doctorId'],
            'departmentName': entry['departmentName'],
            'patientId': entry['patientId'],
            'patientName': entry['patientName'],
            'treatmentPlan': entry.get('treatmentPlan'),
            'diagnosisICD10': entry.get('diagnosisICD10'),
            'intervention': entry.get('intervention'),
            'promsInstrument': entry['promsInstrument'],
            'surveyType': entry['surveyType'],
            'scale': entry['scale'],
            'score': entry['score']
        }

        existing_entry = collection.find_one(duplicate_query)
        if existing_entry:
            print(
                f"Skipped duplicate entry for patient {entry['patientId']} "
                f"- {entry['promsInstrument']} ({entry['surveyType']})"
            )
            continue

        
        # 2) Insert the survey result first (so 'Baseline' is always present)
        result_insert = collection.insert_one(entry)
        print(
            f"Inserted new entry for patient {entry['patientId']} "
            f"- {entry['promsInstrument']} ({entry['surveyType']})"
        )

        # 3) Now calculate MCID (only relevant for Follow-up of Global Health)
        mcid_value = calculate_mcid(
            client,
            patient_info['patientId'],
            proms_instrument,
            survey_result['scale'],
            survey_type,
            current_score
        )
        if mcid_value is not None:
            # 4) Update the newly inserted doc with the MCID
            collection.update_one(
                {'_id': result_insert.inserted_id},
                {'$set': {'mcid': mcid_value}}
            )
            print(f"Updated MCID to {mcid_value} for {survey_type}")

def watch_surveyStatus():
    """
    Listens for updates in 'patient_data' collection where surveyStatus
    changes from "Not Completed" to "Completed". After detection, waits 10 seconds
    and then runs main(Mr_no=...) for that specific patient.
    """
    MONGO_URI = 'mongodb://admin:klmnqwaszx@10.0.2.2:27017/'
    client = create_mongo_client(MONGO_URI)
    collection = client['Data_Entry_Incoming']['patient_data']

    pipeline = [
        {
            "$match": {
                "operationType": "update",
                "updateDescription.updatedFields.surveyStatus": "Completed"
            }
        }
    ]

    print("🔎 Watching for patient_data.surveyStatus changes from Not Completed → Completed...")
    with collection.watch(pipeline, full_document="updateLookup") as stream:
        for change in stream:
            full_doc = change.get("fullDocument")
            if full_doc:
                mr_no = full_doc["Mr_no"]
                print(f"✅ Detected surveyStatus changed to 'Completed' for Mr_no={mr_no}. Waiting 10 seconds...")
                time.sleep(10)  # Wait for 10 seconds before processing
                main(Mr_no=mr_no)


if __name__ == "__main__":
    # Currently calls main(Mr_no='400') by default:
    # main(Mr_no='400')
    
    # Uncomment below if you want to run the watch function instead:
    watch_surveyStatus()

    # main(Mr_no='400')
