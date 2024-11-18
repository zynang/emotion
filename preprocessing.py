import numpy as np
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split



def downsample_labels(labels, target_rate, original_rate=700):
    """
    Downsample the labels array to match the target sampling rate, since labels (700Hz), BVP (64Hz) and EDA (4Hz)
    """
    factor = original_rate // target_rate
    downsampled_labels = labels[::factor]  
    return downsampled_labels


def load_wesad_data(subject_files, base_path="WESAD"):
    X_bvp = []
    X_eda = []
    y_bvp = []
    y_eda = []

    for file in subject_files:
        with open(os.path.join(base_path, file), "rb") as f:
            data = pickle.load(f, encoding="latin1")
        
        bvp = data["signal"]["wrist"]["BVP"]
        eda = data["signal"]["wrist"]["EDA"]
        labels = data["label"]

        # downsample labels to match signal rates
        labels_bvp = downsample_labels(labels, target_rate=64) # BVP measured at 64Hz using Empatica 4
        labels_eda = downsample_labels(labels, target_rate=4) # EDA measured at 4Hz using Empatica 4
    
        # trim signals and labels to same length (if discrepancy remains)
        min_len_bvp = min(len(bvp), len(labels_bvp))
        min_len_eda = min(len(eda), len(labels_eda))
        
        X_bvp.extend(bvp[:min_len_bvp])
        X_eda.extend(eda[:min_len_eda])
        y_bvp.extend(labels_bvp[:min_len_bvp])
        y_eda.extend(labels_eda[:min_len_eda])


    return np.array(X_bvp), np.array(X_eda), np.array(y_bvp), np.array(y_eda)

subject_files = ["S2/S2.pkl", "S3/S3.pkl", "S4/S4.pkl", "S5/S5.pkl", "S6/S6.pkl", "S7/S7.pkl", "S8/S8.pkl", "S9/S9.pkl", "S10/S10.pkl", "S11/S11.pkl", "S13/S13.pkl", "S14/S14.pkl", "S15/S15.pkl", "S16/S16.pkl", "S17/S17.pkl" ]
X_bvp, X_eda, y_bvp, y_eda = load_wesad_data(subject_files)


X_bvp_train, X_bvp_test, y_bvp_train, y_bvp_test = train_test_split(X_bvp, y_bvp, random_state=0, train_size=.8)
X_eda_train, X_eda_test, y_eda_train, y_eda_test = train_test_split(X_eda, y_eda, random_state=0, train_size=.8)


