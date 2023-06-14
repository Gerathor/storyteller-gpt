import path from 'path';
import { BaseMemory } from 'langchain/memory';
import { InputValues } from 'langchain/schema';
import axios from 'axios';
import faiss from 'faiss-node';

// Setup Faiss
const localIndexPath = path.resolve(process.cwd(), 'src', 'embedding', 'index');
console.log('Initializing Faiss Index at: ', localIndexPath)

interface VectorQueryResult {
    texts: string[];
    distances: number[];
}

class FaissManager extends BaseMemory {
    private index!: faiss.IndexFlatL2;  // Use an appropriate index type
    origTexts: string[];  
    constructor() {
        super();
        this.index = new faiss.IndexFlatL2(768);  // Initialize index with dimension size
        this.origTexts = [];  // Array to store the original text strings
    }

    async addItem(text: string) {
        const embeddings = await this.getEmbedding(text);
        this.index.add(embeddings);
        this.origTexts.push(text);
    }

    async queryItems(text: string, topK: number): Promise<VectorQueryResult> {
        const embeddings = await this.getEmbedding(text);
        const { distances, labels } = this.index.search(embeddings, topK);
        const texts = labels.map(id => this.origTexts[id]);  // Look up the original text strings

        // You'll need to map labels to items
        return { texts, distances };
    }

    getIndex() {
        return this.index;
    }

    // keys that your memory implementation uses to store data
    get memoryKeys(): string[] {
        return ['text'];  // replace with the actual keys you'll be using in the memory
    }
    
    async loadMemoryVariables(values: InputValues): Promise<Record<string, any>> {
        // Assuming `index` is a key in values, adjust accordingly
        return { 'text': values['text'] };
    }
    
    async saveContext(inputValues: InputValues, outputValues: Record<string, any>): Promise<void> {
        // Implement this based on how you want to save context in your application
    }

    async getEmbedding(text: string): Promise<number[]> {
        const response = await axios.post('http://localhost:6000/embed', { text });
        if (!Array.isArray(response.data) || response.data.length !== 1) {
            throw new Error('Unexpected response from the embedding service: ' + JSON.stringify(response.data));
        }
        return response.data[0];
    }
    // Retrieve embeddings from the Flask microservice
    async getEmbeddings(text: string): Promise<number[][]> {
        const response = await axios.post('http://localhost:6000/embed', { text });
        if (!Array.isArray(response.data) || response.data.some(embedding => !Array.isArray(embedding))) {
            throw new Error('Unexpected response from the embedding service: ' + JSON.stringify(response.data));
        }
        return response.data;
    }
}

export default FaissManager;
