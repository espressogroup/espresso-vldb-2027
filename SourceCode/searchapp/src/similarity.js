const fs = require('fs');
const math = require('mathjs');
const word2vec = require('word2vec');

const modelPath = "/Users/ragab/Desktop/helloworld_searchapp/src/embeddings/";

// Preprocess text
function preprocessText(text) {
    let cleanedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    cleanedText = cleanedText.replace(/\b\d+\b/g, "").replace(/\d{4}-\d{2}-\d{2}/g, "");
    return cleanedText.split(" ");
}

// Compute TF-IDF vector
function computeTFIDF(text,dfTable, N) {
    const words = preprocessText(text);
    const tf = {};

    words.forEach(word => {
        tf[word] = (tf[word] || 0) + 1;
    });

    const totalWords = words.length;
    Object.keys(tf).forEach(word => {
        tf[word] /= totalWords;
    });

    const tfidf = {};
    Object.keys(tf).forEach(word => {
        const df = dfTable[word] || 0;
        const idf = Math.log(N / (df + 1));
        tfidf[word] = tf[word] * idf;
    });

    return tfidf;
}

// Compute cosine similarity
function cosineSimilarity(vec1, vec2) {
    const words = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    let dotProduct = 0, normA = 0, normB = 0;

    words.forEach(word => {
        const val1 = vec1[word] || 0;
        const val2 = vec2[word] || 0;
        dotProduct += val1 * val2;
        normA += val1 * val1;
        normB += val2 * val2;
    });

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    return normA && normB ? dotProduct / (normA * normB) : 0;
}

// Compute Euclidean distance
function euclideanDistance(vec1, vec2) {
    const words = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    let sum = 0;

    words.forEach(word => {
        const val1 = vec1[word] || 0;
        const val2 = vec2[word] || 0;
        sum += Math.pow(val1 - val2, 2);
    });

    return Math.sqrt(sum);
}

// Load Word2Vec vectors and compute similarity
function word2VecSimilarity(queryTokens, docTokens,accesslevel) {
    return new Promise((resolve, reject) => {
        const modelEmbedding=`${modelPath}Gov2Word_finetuned${accesslevel}.bin`;
        word2vec.loadModel(modelEmbedding, (err, model) => {
            if (err) {
                reject("Error loading Word2Vec model:", err);
                return;
            }

            const queryVectors = queryTokens.map(word => model.getVector(word)).filter(v => v);
            const docVectors = docTokens.map(word => model.getVector(word)).filter(v => v);

            if (queryVectors.length === 0 || docVectors.length === 0) {
                resolve({ cosine: 0, euclidean: Infinity });
                return;
            }

            const avgVector = (vectors) => {
                const sumVector = vectors.reduce((acc, v) => acc.map((val, i) => val + v.values[i]), new Array(vectors[0].values.length).fill(0));
                return sumVector.map(val => val / vectors.length);
            };

            const queryVector = avgVector(queryVectors);
            const docVector = avgVector(docVectors);

            const cosine = math.dot(queryVector, docVector) / (math.norm(queryVector) * math.norm(docVector));
            const euclidean = math.sqrt(queryVector.reduce((acc, val, i) => acc + Math.pow(val - docVector[i], 2), 0));

            resolve({ cosine, euclidean });
        });
    });
}

// Compute both similarities
async function calculateSimilarityMetrics(query, document,dfTable, N,accesslevel) {
    const queryTokens = preprocessText(query);
    const docTokens = preprocessText(document);

    // TF-IDF Similarity
    const queryTFIDF = computeTFIDF(query,dfTable, N);
    const docTFIDF = computeTFIDF(document,dfTable, N);
    const cosineTFIDF = cosineSimilarity(queryTFIDF, docTFIDF);
    const euclideanTFIDF = euclideanDistance(queryTFIDF, docTFIDF);
    const invertedEuclideanTFIDF = 1 / (1 + euclideanTFIDF);

    // Word2Vec Similarity
    const { cosine: cosineW2V, euclidean: euclideanW2V } = await word2VecSimilarity(queryTokens, docTokens,accesslevel);
    const invertedEuclideanW2V = 1 / (1 + euclideanW2V);

    return {
        cosineW2VSimilarity: cosineW2V,
        cosineTFIDFSimilarity: cosineTFIDF,
        invertedEuclideanW2V: invertedEuclideanW2V,
        invertedEuclideanTFIDF: invertedEuclideanTFIDF
    };
}

// Compute similarity for multiple documents
async function calculateSimilarityScore(query, nestedResults,dfTable, N,accesslevel) {
    let output = [];

    const documents = nestedResults.reduce((acc, result) => acc.concat(result.documents), []);

    const promises = documents.map(async (doc) => {
        try {
            const similarityMetrics = await calculateSimilarityMetrics(query, doc.content,dfTable, N,accesslevel);
            output.push({ docId: doc.Id, ...similarityMetrics });
        } catch (error) {
            console.error("Error calculating similarity:", error);
        }
    });

    await Promise.all(promises);
    return output;
}

// Export functions
module.exports = {
    calculateSimilarityMetrics,
    calculateSimilarityScore
};