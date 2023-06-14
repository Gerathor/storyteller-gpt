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
    texts = request.json['text']
    embeddings_list = []
    for text in texts:
        inputs = tokenizer(text, return_tensors='pt')
        outputs = model(**inputs)
        embeddings = outputs.last_hidden_state.mean(dim=1)
        embeddings = embeddings.detach().numpy()  # Convert to numpy array
        embeddings_list.append(embeddings.tolist())
    # Return a 2D array instead of a list of 2D arrays when there's only one text to embed
    if len(embeddings_list) == 1:
        return jsonify(embeddings_list[0])
    else:
        return jsonify(embeddings_list[0])


if __name__ == '__main__':
    app.run(port=6000)
