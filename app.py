from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads folder if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Global variable to store the current DataFrame
current_df = None

@app.route('/upload', methods=['POST'])
def upload_file():
    global current_df
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Read the file based on extension
        if filename.endswith('.csv'):
            current_df = pd.read_csv(file_path)
        elif filename.endswith(('.xls', '.xlsx')):
            current_df = pd.read_excel(file_path)
        else:
            return jsonify({'error': 'Unsupported file format'}), 400
        
        return jsonify({
            'message': 'File uploaded successfully',
            'columns': current_df.columns.tolist(),
            'shape': current_df.shape
        })

@app.route('/check_null', methods=['GET'])
def check_null():
    if current_df is None:
        return jsonify({'error': 'No data loaded'}), 400
    
    null_counts = current_df.isnull().sum().to_dict()
    total_nulls = current_df.isnull().sum().sum()
    
    return jsonify({
        'null_counts': null_counts,
        'total_nulls': int(total_nulls)
    })

@app.route('/remove_null', methods=['POST'])
def remove_null():
    global current_df
    if current_df is None:
        return jsonify({'error': 'No data loaded'}), 400
    
    method = request.json.get('method', 'dropna')
    columns = request.json.get('columns', None)
    
    try:
        if method == 'dropna':
            if columns:
                current_df = current_df.dropna(subset=columns)
            else:
                current_df = current_df.dropna()
        elif method == 'fillna':
            fill_value = request.json.get('fill_value', 0)
            if columns:
                for col in columns:
                    current_df[col] = current_df[col].fillna(fill_value)
            else:
                current_df = current_df.fillna(fill_value)
        
        return jsonify({
            'message': 'Null values handled successfully',
            'new_shape': current_df.shape
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/get_summary', methods=['GET'])
def get_summary():
    if current_df is None:
        return jsonify({'error': 'No data loaded'}), 400
    
    summary = {
        'shape': current_df.shape,
        'columns': current_df.columns.tolist(),
        'dtypes': current_df.dtypes.astype(str).to_dict(),
        'null_counts': current_df.isnull().sum().to_dict()
    }
    
    return jsonify(summary)

if __name__ == '__main__':
    app.run(debug=True, port=5000) 