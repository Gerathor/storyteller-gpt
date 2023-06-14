import path from 'path';
import { BaseMemory } from 'langchain/memory';
import axios from 'axios';
import faiss from 'faiss-node';
import { InputValues } from 'langchain/schema';

// Setup Faiss
const localIndexPath = path.resolve(process.cwd(), 'src', 'embedding', 'index');
console.log('Initializing Faiss Index at: ', localIndexPath);

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

  async loadMemoryVariables(values: InputValues): Promise<VectorQueryResult> {
    const embeddings = await this.getEmbedding(values.text);

    // Check if the index is empty
    if (this.index.ntotal() === 0) {
      return { texts: [], distances: [] };
    }
    const { distances, labels } = this.index.search(embeddings, 1);
    const texts = labels.map((id) => this.origTexts[id]);

    return { texts, distances };
  }

  async saveContext(inputValues: InputValues): Promise<void> {
    const embeddings = await this.getEmbedding(inputValues.text);
    this.index.add(embeddings);
    this.origTexts.push(inputValues.text);
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await axios.post('http://localhost:6000/embed', { text });
    if (!Array.isArray(response.data) || response.data.length !== 1) {
      throw new Error(
        'Unexpected response from the embedding service: ' +
          JSON.stringify(response.data)
      );
    }
    return response.data[0];
  }

  // haven't tested this yet
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
    return response.data;
  }
}

export default FaissManager;
