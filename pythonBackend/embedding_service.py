from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModel
import torch
import numpy as np

app = Flask(__name__)

# Load the model and tokenizer
tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
model = AutoModel.from_pretrained('bert-base-uncased')

@app.route('/embed', methods=['POST'])
def embed():
    text = request.json['text']
    inputs = tokenizer(text, return_tensors='pt')
    outputs = model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1)
    embeddings = embeddings.detach().numpy()  # Convert to numpy array
    # Convert to list for JSON serialization
    return jsonify(embeddings.tolist())

if __name__ == '__main__':
    app.run(port=6000)
