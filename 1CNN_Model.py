import tensorflow as tf
from tensorflow.keras.layers import Input, Conv1D, MaxPooling1D, Flatten, Dense, concatenate
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam

from preprocessing import load_wesad_data
from sklearn.model_selection import train_test_split

subject_files = ["S2/S2.pkl", "S3/S3.pkl", "S4/S4.pkl", "S5/S5.pkl", "S6/S6.pkl", "S7/S7.pkl", "S8/S8.pkl", "S9/S9.pkl", "S10/S10.pkl", "S11/S11.pkl", "S13/S13.pkl", "S14/S14.pkl", "S15/S15.pkl", "S16/S16.pkl", "S17/S17.pkl" ]


def cnn_pass(input_shape):
    input_layer = Input(shape=input_shape)
    x = Conv1D(filters=32, kernel_size=3, strides=2, activation='relu')(input_layer)
    x = MaxPooling1D(pool_size=2)(x)
    x = Conv1D(filters=64, kernel_size=3, strides=2, activation='relu')(x)
    x = MaxPooling1D(pool_size=2)(x)
    x = Conv1D(filters=128, kernel_size=3, strides=2, activation='relu')(x)
    x = MaxPooling1D(pool_size=2)(x)
    x = Flatten()(x)
    return input_layer, x


X_bvp, X_eda, y_bvp, y_eda = load_wesad_data(subject_files)
X_bvp_train, X_bvp_test, y_bvp_train, y_bvp_test = train_test_split(X_bvp, y_bvp, random_state=0, train_size=.8)
X_eda_train, X_eda_test, y_eda_train, y_eda_test = train_test_split(X_eda, y_eda, random_state=0, train_size=.8)

# Define input shapes based on BVP and EDA sampling rates
input_shape_bvp = (len(X_bvp_train[0]), 1)  # Single channel for BVP
input_shape_eda = (len(X_eda_train[0]), 1)  # Single channel for EDA

# Create separate CNN channels
bvp_input, bvp_channel = cnn_pass(input_shape_bvp)
eda_input, eda_channel = cnn_pass(input_shape_eda)

print("bvp: " + input_shape_bvp) 
print("eda: " + input_shape_eda)


# # Concatenate channels and add fully connected layers
# concatenated = concatenate([bvp_channel, eda_channel])
# dense = Dense(64, activation='relu')(concatenated)
# output = Dense(1, activation='sigmoid')(dense)

# # Create and compile the model
# model = Model(inputs=[bvp_input, eda_input], outputs=output)
# model.compile(optimizer=Adam(), loss='binary_crossentropy', metrics=['accuracy'])

# # Print model summary
# model.summary()