import csv
import os
import sys
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from mpl_toolkits.mplot3d import Axes3D

import data_analysis_folder_generation as d

def read_csv_file_as_dataframe(file_path):
    df = pd.read_csv(file_path)
    return df

file_path = 'patient.csv'
patients_df = read_csv_file_as_dataframe(file_path)

#For clearing the folder files

def clear_patient_plots_folder():
    folder_path = 'patient_plots'
    if os.path.exists(folder_path):
        for file_name in os.listdir(folder_path):
            file_path = os.path.join(folder_path, file_name)
            os.remove(file_path)
        print("Folder is generated")
    else:
        print("Folder 'patient_plots' does not exist.")

#renaming the file
import os
import shutil

def rename_files_and_create_new_folder(old_folder_path, new_folder_path, prefix):
    # Create the new folder if it doesn't exist
    if not os.path.exists(new_folder_path):
        os.makedirs(new_folder_path)

    # Get list of files in the old folder
    files = os.listdir(old_folder_path)
    
    # Sort files to ensure consistent order
    files.sort()
    
    # Iterate over each file and rename, then move to new folder
    for i, filename in enumerate(files, start=1):
        # Generate new filename
        new_filename = f"{prefix}{i}.jpg"  # Change extension if needed
        
        # Get current file path and new file path
        old_path = os.path.join(old_folder_path, filename)
        new_path = os.path.join(new_folder_path, new_filename)
        
        # Rename the file
        os.rename(old_path, new_path)
        
        print(f"Renamed {filename} to {new_filename} and moved to {new_folder_path}")

# Path to the folder containing the patient plots
old_folder_path = "patient_plots"

# Path to the new folder
new_folder_path = "new_folder"

# Prefix for the new filenames
prefix = "plot_"

# Call the function to rename files and create new folder
# rename_files_and_create_new_folder(old_folder_path, new_folder_path, prefix)


if __name__=='__main__':
    # n = int(input('Enter the Patient MR NUMBER : '))
    input_data = sys.argv[1]
    clear_patient_plots_folder()
    d.generate_patient_plots(patients_df,int(input_data))
    rename_files_and_create_new_folder(old_folder_path, new_folder_path, prefix)
