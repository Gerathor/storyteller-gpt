import { BaseMemory } from 'langchain/memory';
import axios from 'axios';
import faiss from 'faiss-node';
import { InputValues } from 'langchain/schema';

interface VectorQueryResult {
  texts: string[];
  distances: number[];
}

class FaissManager extends BaseMemory {
  private index!: faiss.IndexFlatL2;
  private origTexts: string[];

  constructor() {
    super();
    this.index = new faiss.IndexFlatL2(768); // Initialize index with dimension size
    this.origTexts = []; // Array to store the original text strings
  }

  get memoryKeys(): string[] {
    return ['text'];
  }

  async loadMemoryVariables(
    values: InputValues,
    numberOfResults = 1
  ): Promise<VectorQueryResult> {
    const embeddings = await this.getEmbeddings([values.text]);

    // Check if the index is empty
    if (this.index.ntotal() < numberOfResults) {
      while (this.index.ntotal() < numberOfResults) {
        numberOfResults = numberOfResults - 1;
        if (numberOfResults === 0) {
          return { texts: [], distances: [] };
        }
        // if while loop breaks it means that numberOfResults is above 0 but below ntotal
      }
    }
    const { distances, labels } = this.index.search(
      embeddings[0],
      numberOfResults
    );
    const texts = labels.map((id) => this.origTexts[id]);

    return { texts, distances };
  }

  async saveContext(
    inputValues: InputValues,
    outputValues?: InputValues
  ): Promise<void> {
    // add text to array if not undefined
    const getEmbeddingsFor = [inputValues.text, outputValues?.text].filter(
      Boolean
    );
    const embeddings = await this.getEmbeddings(getEmbeddingsFor);
    embeddings.forEach((embedding) => {
      this.index.add(embedding);
      this.origTexts.push(inputValues.text);
    });
  }

  private async getEmbeddings(text: string[]): Promise<number[][]> {
    const response = await axios.post('http://localhost:6000/embed', { text });
    if (
      !Array.isArray(response.data) ||
      response.data.some((embedding) => !Array.isArray(embedding))
    ) {
      throw new Error(
        'Unexpected response from the embedding service: ' +
          JSON.stringify(response.data)
      );
    }
    return response.data; // I really don't know why this is necessary
  }
}

export default FaissManager;
