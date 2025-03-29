const express = require('express');
const axios = require('axios');
const fs = require("fs");
const https = require("https");
const cors = require('cors');
const pLimit = require('p-limit');
const yargs = require('yargs');
const path = require("path");
const AdmZip = require('adm-zip');
const stream = require('stream');
const app = express();
const port = 8080;


app.use(cors()); // Enable CORS if needed
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data


const OverlayQueryExecutor = require('./OverlayQueryExecutor');
const {retrieveRelevantData,retrieveRelevantData_Overlay, mergeAndRerank,retrieveRelevantDataTweb}= require('./lucenemodule');
const {fetchBloomFilterStream,filterQuery, areAllKeywordsAbsent} = require('./bloomfiltersmodule');
const {calculateSimilarityScore} = require("./similarity");

// Read the JSON file synchronously
const data = fs.readFileSync('/Users/ragab/Desktop/helloworld_searchapp/src/global.json', 'utf8');


// Parse the JSON data
const jsonData = JSON.parse(data);

let avgDocLength =jsonData.averageDocLength.toFixed(2);
let documentFrequencies = jsonData.documentFrequencies;
let totalDocuments = jsonData.totalDocuments.toFixed(2);
// Compute total sum of document frequencies
const totalDocFrequencies = Object.values(documentFrequencies).reduce((sum, df) => sum + parseFloat(df), 0.0);


async function calculateVectoreScores(query, documents,accesslevel) {
    return await calculateSimilarityScore(query, documents,documentFrequencies,totalDocuments,accesslevel);
}




const certificate = fs.readFileSync('./ca.pem');
// const httpsAgent = new https.Agent({ ca: certificate, rejectUnauthorized: false});

const httpsAgent = new https.Agent({
    ca: certificate,
    rejectUnauthorized: false,
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 50
});
const axiosInstance = axios.create({ httpsAgent });

app.use(cors());


MAX_CONCURRENCY = Math.min(25, require('os').cpus().length * 2);
const limit = pLimit(MAX_CONCURRENCY);



function calculateBM25(query, documents, k = 1.2, b = 0.75) {
    // Tokenize the query into terms
    const queryTerms = query.toLowerCase().split(/\s+/);
    let results = [];

    // Loop through each document and calculate its BM25 score for the query
    documents.forEach((doc) => {
        let bm25Score = 0.0;

        // Loop through each query term
        queryTerms.forEach((term) => {

            // Term Frequency (TF) in the document (default to 0 if term is not present)
            const tf_d = doc.TermFrequencies[term] || 0.0;



            // Document frequency (DF) of the term (use the global `documentFrequencies` object)
            const df_t = documentFrequencies[term] || 0;
            // console.log(df_t);

            // console.log(totalDocuments);
            // Calculate IDF for the term (ensure it's a float)
            const idf_t = Math.log((totalDocuments - df_t + 0.5) / (df_t + 0.5) + 1.0);


            // Document length (assume `DocLength` exists in `doc` object)
            const docLength = doc.DocLength;

            // Calculate BM25 score for this term in the document
            const termScore = parseFloat((idf_t * (tf_d * (k + 1)) / (tf_d + k * ((1 - b) + b * (docLength / avgDocLength)))).toFixed(6));

            bm25Score += termScore;
        });

        // Store the BM25 score for the document
        results.push({
            docId: doc.Id, // Assuming each doc has an id
            bm25Score: parseFloat(bm25Score.toFixed(6)), // Ensure score is a float with precision
        });
    });

    return results;
}

const LM = (query, document, lambda_d = 0.2) => {
    let lmScore = 0.0;
    const words = document.content.toLowerCase().split(/\s+/);
    const docLength = document.DocLength;

    // Compute term frequencies on the fly
    let termFrequencies = {};
    words.forEach(word => {
        termFrequencies[word] = (termFrequencies[word] || 0) + 1;
    });

    const queryTerms = query.toLowerCase().split(/\s+/);

    queryTerms.forEach(term => {
        const tf_d = parseFloat(termFrequencies[term] || 0);
        const alpha_c = parseFloat((documentFrequencies[term] || 0) / totalDocFrequencies); // Compute background model
        const p_lm = (1 - lambda_d) * (tf_d / docLength) + lambda_d * alpha_c;

        if (p_lm > 0) {
            lmScore += Math.log(p_lm);
        }
    });

    return parseFloat(lmScore);
};
const computeLMScores = (query, documents) => {
    let results = [];

    documents.forEach(doc => {
        const score = LM(query, doc);
        results.push({
            docId: doc.Id,
            lmScore: parseFloat(score.toFixed(6)) // Ensure float precision
        });
    });

    return results;
};



async function fetchFile(url) {
    try {
        const response = await axiosInstance.get(url);
        return response.data.split("\r\n").filter(line => line.length > 0);
    } catch (error) {
        console.log(`Error fetching file from ${url}: ${error.message}`);
        return null;
    }
}

async function queryOverlayMetadata(keyword, webid,topKServers) {
    const queryExecutor = new OverlayQueryExecutor();
    const overlayMetadataQuery = `SELECT srvurl FROM LTOVERLAYLUCENE WHERE webid='${webid}'`;

    const overlayResult = await new Promise((resolve, reject) => {
        queryExecutor.executeQuery(overlayMetadataQuery, (error, result) => {
            if (error) {
                console.error("Overlay query execution error:", error.message || error);
                reject(error);
            } else {
                resolve(result);
            }
        });
    });

    if (!overlayResult || overlayResult.length === 0) {
        console.warn(`No entry found for WebID '${webid}' in Overlay Network.`);
        return [];
    }

    const serverUrl = overlayResult[0]?.SRVURL;
    if (serverUrl && serverUrl !== 'null') {
        console.log("Successfully fetched metadata for the WebID from overlay network.");
        // const overlayIndexURL = `https://${serverUrl}/ESPRESSO/metaindex/${webid}-servers.zip`;

        try {
            const relevantServerIDs = await retrieveRelevantData_Overlay(keyword, webid, serverUrl, topKServers);

            return relevantServerIDs.flatMap((result) => result.documents.map((doc) => doc.Id));
        } catch (error) {

            if (error==="Error parsing JSON result: Unexpected end of JSON input")
            {
                console.warn(`WEBID Has Access to the Servers But no access to Files of the KWD!`);
                return [];
            }

            else
            {
                console.error(`Error retrieving data from overlay index ${serverUrl}:`, error);
                throw error;
            }
        }
    } else {
        console.warn(`Overlay metadata for WebID '${webid}' is invalid.`);
        throw new Error("Overlay network returned null or invalid server URL.");
    }
}

async function readAllServers() {
    const queryExecutor = new OverlayQueryExecutor();
    const fallbackQuery = `SELECT srvURL FROM LTOVERLAYSERVERS`;

    const fallbackResult = await new Promise((resolve, reject) => {
        queryExecutor.executeQuery(fallbackQuery, (error, result) => {
            if (error) {
                console.error("Fallback query execution error:", error.message || error);
                reject(error);
            } else {
                resolve(result);
            }
        });
    });

    if (fallbackResult && fallbackResult.length > 0) {
        console.log("Fetched all server URLs from the fallback query.");
        return fallbackResult.map((row) => row.SRVURL);
    } else {
        console.warn("Fallback query returned no results.");
        return [];
    }
}


async function checkIfPodIsRelevantWithBloom(keyword, bloomFilterStream) {
    try {
        // Execute the JAR file with the fetched Bloom filter stream
        const filteredQuery = await filterQuery(keyword, bloomFilterStream);

        // Determine if the server is relevant
        if (filteredQuery.trim()) {
            // console.log(`Relevant pod based on Bloom filter`);
            return true;
        } else {
            // console.log(`No relevant data in Bloom filter.`);
            return false;
        }
    } catch (error) {
        console.error(`Error processing Bloom filter stream: ${error.message || error}`);
        throw error;
    }
}


async function findRelevantPodsWithBloom(keyword, webid, serverURL) {
    console.log("Finding Pods Using Bloom!");
    const relevantPods = [];
    const processedPods = new Set();

    const podWebIDBloomZipUrl = `https://${serverURL}/ESPRESSO/metaindex/${webid}-bloom.zip`;

    try {
        const zipResponse = await axiosInstance.get(podWebIDBloomZipUrl, { responseType: 'arraybuffer' });
        const zipBuffer = zipResponse.data;

        // Verify ZIP file
        if (!zipBuffer || zipBuffer.byteLength === 0) {
            console.error("ZIP buffer is empty or invalid.");
            return relevantPods;
        }

        const zip = new AdmZip(zipBuffer);
        const zipEntries = zip.getEntries();

        // Filter relevant Bloom files
        const bloomEntries = zipEntries.filter(entry =>
            entry.entryName.endsWith('.bloom') && !entry.entryName.includes('__MACOSX')
        );

        const batchSize = 32;
        const totalEntries = bloomEntries.length;
        let batchPromises = [];

        for (let i = 0; i < totalEntries; i++) {
            const entry = bloomEntries[i];
            const entryName = entry.entryName;

            // Optimized pod name extraction
            // Extract the pod name
            const parts = entryName.split('-');
            const podNameParts = parts.slice(parts.length - 2);
            let podName = podNameParts.join('-').replace('.bloom', '');

            const podUrl = `https://${serverURL}/${podName}`;

            if (processedPods.has(podUrl)) continue;

            // Process Bloom filter in parallel
            batchPromises.push((async () => {
                try {
                    const bloomFilterData = entry.getData();
                    const bloomFilterStream = new stream.PassThrough();
                    bloomFilterStream.end(bloomFilterData);

                    const isRelevant = await checkIfPodIsRelevantWithBloom(keyword, bloomFilterStream);
                    if (isRelevant) {
                        relevantPods.push(podUrl);
                        processedPods.add(podUrl);
                    }
                } catch (error) {
                    console.error(`Error processing ${entryName}: ${error.message}`);
                }
            })());

            if (batchPromises.length >= batchSize || i === totalEntries - 1) {
                await Promise.allSettled(batchPromises);
                batchPromises = [];
            }
        }
    } catch (error) {
        console.error(`Failed to process pods at ${serverURL}: ${error.message}`);
    }

    return relevantPods;
}



async function checkIfServersRelevantWithBloom(keyword, webid, baseUrl) {
    // Construct the Bloom filter file URL dynamically based on WebID
    const serverWebIDBloomUrl = `https://${baseUrl}/ESPRESSO/metaindex/${webid}-pods-ESPRESSO.bloom`;

    try {
        // Fetch the Bloom filter stream directly
        const bloomFilterStream = await fetchBloomFilterStream(serverWebIDBloomUrl);

        // Execute the JAR file with the fetched Bloom filter stream
        const filteredQuery = await filterQuery(keyword, bloomFilterStream);

        // Determine if the server is relevant
        if (filteredQuery.trim()) {
            // console.log(`Relevant server for WebID ${webid}: ${baseUrl}`);
            return baseUrl;
        } else {
            //console.log(`No relevant server for WebID ${webid} at ${baseUrl}.`);
            return null;
        }
    } catch (error) {

        // Handle the 404 error gracefully
        if (error.response && error.response.status === 404) {
            // console.warn(`Bloom filter not found for WebID ${webid} at ${baseUrl}: 404 Not Found`);
            return null;
        }

        console.error(`Error processing server at ${baseUrl}: ${error.message || error}`);
        throw error;
    }
}


async function findRelevantServersWithBloom(keyword, webid) {
    console.log("Finding Servers Using Bloom!")
    const allServers = await readAllServers();

    // console.log(allServers);

    const relevantServers = [];
    for (const serverUrl of allServers) {
        const relevantServer = await checkIfServersRelevantWithBloom(keyword, webid, serverUrl);
        if (relevantServer) {
            relevantServers.push(relevantServer);
        }
    }

    return relevantServers;
}



async function findServersWithLucene(keyword, webid, useOverlayMetadata,topKServers) {
    console.log("Finding Servers Using Lucene!")
    try {
        if (useOverlayMetadata) {
            return await queryOverlayMetadata(keyword, webid,topKServers);
        } else {
            console.log("Using fallback solution to read all servers.");
            return await readAllServers();
        }
    } catch (error) {
        console.warn("Error occurred; falling back to fallback solution.", error);
        return await readAllServers();
    }
}

async function findPodsWithLucene(webIdQuery, keyword, baseUrl,metaIndexName,useServerMetadata,topKPods) {
    console.log("Finding Pods Using Lucene!")
    // Determine the serverIndexUrl based on the `useServerMetadata` parameter
    const serverIndexUrl = useServerMetadata
        ? `https://${baseUrl}/ESPRESSO/metaindex/`
        : `https://${baseUrl}.soton.ac.uk:3000/ESPRESSO/metaindexer_test_wrong/`;

    /////// Check if the `server_index` container exists, otherwise fall back to read all pods ///////
    const serverIndexData = await fetchFile(serverIndexUrl);
    if (
        !serverIndexData ||
        (Array.isArray(serverIndexData) && serverIndexData.length === 1 &&
            typeof serverIndexData[0] === 'string' && !serverIndexData[0].includes('ldp:contains'))
    ) {
        console.log(`server_index not found at ${serverIndexUrl} , falling back to readAllSources...`);
        return await readAllPods(baseUrl,metaIndexName);
    }


    let relevantPodsResults;
    // Construct the URL dynamically based on the WebID
    const serverWebIDIndexUrl = `https://${baseUrl}/ESPRESSO/metaindex/${webIdQuery}-pods.zip`;

    try {
        relevantPodsResults = await retrieveRelevantData(keyword, webIdQuery, serverWebIDIndexUrl, topKPods);

        // console.log("relevantPodsResults:", JSON.stringify(relevantPodsResults, null, 2));

        let podDocuments;
        if (Array.isArray(relevantPodsResults)) {
            // If it's an array, extract documents from the first element
            podDocuments = relevantPodsResults[0]?.documents || [];
        } else if (relevantPodsResults && relevantPodsResults.documents) {
            // If it's an object, use documents directly
            podDocuments = relevantPodsResults.documents;
        } else {
            console.error("Error: relevantPodsResults.documents is missing or not an array", relevantPodsResults);
            return [];
        }

        // Extract the list of Pod IDs from the documents array
        const relevantPodIDs = podDocuments.map(doc => doc.Id);
        // const relevantPodIDs = relevantPodsResults.flatMap((result) => result.documents.map((doc) => doc.Id));
        const relevantPodURLs = relevantPodIDs.map((id) => `${baseUrl}/${id}`);

        // Return the list of Pod IDs
        return relevantPodURLs;

    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.warn(`Cannot find Index of ${serverWebIDIndexUrl}`);
            return [];
        }
        else if (error==="Error parsing JSON result: Unexpected end of JSON input")
        {
            console.warn(`WEBID Has Access to the Server But no access to Files of the KWD!`);
            return [];
        }
        else {
            console.error(`Error during search at ${baseUrl}: ${error.message || error}`);
            throw error;
        }
    }
}

async function readAllPods(baseUrl,metaIndexName) {

    try {
        const response = await axiosInstance.get(`https://${baseUrl}/ESPRESSO/${metaIndexName}`, { responseType: 'blob' });
        const csvStr = response.data.toString();
        let selectedPods = csvStr.split("\r\n").filter(i => i.length > 0);
        // Remove the pattern "/espressoindex/" from each item
        selectedPods = selectedPods.map(item => item.replace("/espressoindex/", ""));

        return selectedPods;
    } catch (error) {
        console.error(`Error fetching meta-index at https://${baseUrl}/ESPRESSO/${metaIndexName}. Returning empty results.`, error.message);
        return [];
    }
}


async function integrateResults(sources, webIdQuery, searchWord,topKPodDocs,layer,rankingmodeldocuments) {
    let integratedResult = [];
    async function processBatch(batch) {
        const requests = batch.map((source) =>
            limit(async () => {
                const normalizedSource = source.startsWith("https://")
                    ? source
                    : `https://${source}`;

                const webIDPodIndex = `${normalizedSource}/espressoindex/${webIdQuery}.zip`;

                try {
                    // Check if the file exists (status 200)
                    const headResponse = await axiosInstance.head(webIDPodIndex, {
                        validateStatus: (status) => status === 200 || status === 404 || status === 401,
                        timeout: 500000,
                    });

                    if (headResponse.status === 200) {
                        console.log("Ranking model provided for Documents:", rankingmodeldocuments);

                        let PodIndexSearchResults;
                        if(rankingmodeldocuments!=undefined){
                            PodIndexSearchResults = await retrieveRelevantDataTweb(searchWord, webIdQuery, webIDPodIndex, topKPodDocs,layer,rankingmodeldocuments);
                        }
                        else {
                            PodIndexSearchResults = await retrieveRelevantData(searchWord, webIdQuery, webIDPodIndex, topKPodDocs);
                        }

                        if(rankingmodeldocuments!=undefined){

                            let resultsArray = Array.isArray(PodIndexSearchResults) ? PodIndexSearchResults : [PodIndexSearchResults];

                            resultsArray.forEach((result) => {
                                if (result.documents) {
                                    result.documents = result.documents.map((doc) => ({
                                        ...doc,
                                        content: `${doc.content}`,
                                        Id: `${normalizedSource}/${doc.Id}`,
                                    }));
                                }
                            });

                        }
                        else
                        {
                            // Add URL to the ID of each document
                            PodIndexSearchResults.forEach((result) => {
                                if (result.documents) {
                                    result.documents = result.documents.map((doc) => ({
                                        ...doc,
                                        content: `${doc.content}`,
                                        Id: `${normalizedSource}/${doc.Id}`,
                                    }));
                                }
                            });
                        }

                        integratedResult.push(PodIndexSearchResults);
                    } else if (headResponse.status === 401) {
                        console.warn(`Unauthorized access (401) to Pod: ${normalizedSource}`);
                    } else {
                        //console.warn(`WebID ${webIdQuery} has no access to this Pod: ${source} !`);
                    }
                } catch (error) {
                    if (error== "Error parsing JSON result: Unexpected end of JSON input"){
                        // console.warn(`While processing results from Pod ${source}:`,": WEBID Has Access to the Pod But no access to Files of the KWD! ")
                    } else if (error.response && error.response.status === 401) {
                        //console.error(`Caught 401 error for Pod ${normalizedSource}: Unauthorized. Check credentials or access permissions.`);
                        // Optional: Implement reauthentication or token refresh mechanism here
                    } else{
                        console.error(`Error processing results from Pod ${source}:`, error|| error.message);
                    }
                }
            })
        );

        await Promise.all(requests);
    }

    // Process in batches of pods
    const batchSize=500;
    for (let i = 0; i < sources.length; i += batchSize) {
        const batch = sources.slice(i, i + batchSize);
        await processBatch(batch);
    }

    return integratedResult;
}


async function handleResultsRanking(allIntegratedResults, enableRanking) {
    if (enableRanking) {
        console.log("Ranking is enabled. Merging and re-ranking results...");
        const finalRankedResults = mergeAndRerank(allIntegratedResults);
        return finalRankedResults;
    } else {
        console.log("Ranking is disabled. Returning raw results.");
        const flattenedResults = allIntegratedResults.flatMap(resultSet =>
            resultSet.flatMap(result =>
                result.documents.map(doc => ({
                    Score: doc.Score,
                    Id: doc.Id,
                    content: doc.content
                }))
            )
        );
        return flattenedResults;
    }
}


// async function handleResultsRankingUpdated(allIntegratedResults = [], enableRanking, rankingModel, vectorScores = [], bm25Scores = [], lmScores = []) {
//     if (!Array.isArray(allIntegratedResults)) {
//         console.error("Error: allIntegratedResults is not an array.");
//         return [];
//     }
//
//     // Flatten and extract documents
//     const documents = allIntegratedResults.flat(2)
//         .flatMap(resultSet => (resultSet?.documents || []))
//         .map(doc => ({ ...doc }));
//
//     if (documents.length === 0) {
//         console.warn("Warning: No documents found.");
//         return [];
//     }
//
//     // **Ensure ranking model defaults to BM25 if not set**
//     if (enableRanking && !rankingModel) {
//         rankingModel = "BM25";
//     }
//
//     // **Create lookup maps for scores**
//     const vectorScoreMap = new Map((vectorScores || []).map(s => [s.docId, s]));
//     const bm25ScoreGlobalMap = new Map((bm25Scores || []).map(s => [s.docId, s.bm25Score || 0]));
//     const lmScoreGlobalMap = new Map((lmScores || []).map(s => [s.docId, s.lmScore || 0]));
//
//     // **DEBUGGING: Log the scores provided**
//     console.log("BM25 Scores Global:", bm25Scores);
//     console.log("LM Scores Global:", lmScores);
//
//     // **Determine the ranking field**
//     const scoreMapping = {
//         BM25: "BM25Score",
//         LM: "LanguageModelingScore",
//         cosineTFIDF: "cosineTFIDFSimilarity",
//         euclideanTFIDF: "invertedEuclideanTFIDF"
//     };
//
//     const rankingField = scoreMapping[rankingModel] || "BM25Score";
//
//     // **Rank and score documents**
//     const rankedDocuments = documents.map(doc => {
//         const docId = doc?.Id || "";
//
//         // **Get Local Scores from the document (using 'Score' or 'BM25Score')**
//         const bm25ScoreLocal = doc.BM25Score || doc.Score || 0;  // Use 'Score' if 'BM25Score' is missing
//         const lmScoreLocal = rankingModel === "LM" ? (doc.LanguageModelingScore || 0) : 0;  // LM score directly from document
//
//         // **Get Global Scores from the passed arrays**
//         const lmScoreGlobal = lmScoreGlobalMap.get(docId) || 0;
//         const bm25ScoreGlobal = bm25ScoreGlobalMap.get(docId) || 0;
//
//         // **Extract vector scores**
//         const vectorScoresData = vectorScoreMap.get(docId) || {};
//         const cosineW2VSimilarity = vectorScoresData.cosineW2VSimilarity || 0;
//         const cosineTFIDFSimilarity = vectorScoresData.cosineTFIDFSimilarity || 0;
//         const invertedEuclideanW2V = vectorScoresData.invertedEuclideanW2V || 0;
//         const invertedEuclideanTFIDF = vectorScoresData.invertedEuclideanTFIDF || 0;
//
//         // **Ranking score logic**
//         const rankingScore = enableRanking ? (rankingModel === "LM" ? lmScoreLocal : bm25ScoreLocal) : 0;
//
//         // **DEBUGGING: Log document ID and scores**
//         console.log(`Processing document: ${docId}`);
//         console.log(`BM25ScoreLocal: ${bm25ScoreLocal}, LMScoreLocal: ${lmScoreLocal}, RankingScore: ${rankingScore}`);
//         console.log(`BM25ScoreGlobal: ${bm25ScoreGlobal}, LMScoreGlobal: ${lmScoreGlobal}`);
//
//         return {
//             ...doc,
//             rankingScore,
//             BM25ScoreLocal: bm25ScoreLocal,
//             LanguageModelingScoreLocal: lmScoreLocal,
//             LMScoreGlobal: lmScoreGlobal,
//             BM25ScoreGlobal: bm25ScoreGlobal,
//             cosineW2VSimilarity,
//             cosineTFIDFSimilarity,
//             invertedEuclideanW2V,
//             invertedEuclideanTFIDF
//         };
//     });
//
//     // **Sort by ranking score**
//     return rankedDocuments.sort((a, b) => b.rankingScore - a.rankingScore);
// }


async function handleResultsRankingUpdated(allIntegratedResults = [], enableRanking, rankingModel = "BM25", vectorScores = [], bm25Scores = [], lmScores = []) {
    if (!Array.isArray(allIntegratedResults)) {
        console.error("Error: allIntegratedResults is not an array.");
        return [];
    }

    // Flatten and extract documents
    const documents = allIntegratedResults.flat(2)
        .flatMap(resultSet => (resultSet?.documents || []))
        .map(doc => ({ ...doc }));

    if (documents.length === 0) {
        console.warn("Warning: No documents found.");
        return [];
    }

    // **Create lookup maps for scores**
    const vectorScoreMap = new Map((vectorScores || []).map(s => [s.docId, s]));
    const bm25ScoreGlobalMap = new Map((bm25Scores || []).map(s => [s.docId, s.bm25Score || 0]));
    const lmScoreGlobalMap = new Map((lmScores || []).map(s => [s.docId, s.lmScore || 0]));

    // **DEBUGGING: Log the scores provided**
    // console.log("BM25 Scores Global:", bm25Scores);
    // console.log("LM Scores Global:", lmScores);

    // **Rank and score documents**
    const rankedDocuments = documents.map(doc => {
        const docId = doc?.Id || "";

        // **Local document scores**
        const bm25ScoreLocal = doc.BM25Score || doc.Score || 0;
        const lmScoreLocal = doc.LanguageModelingScore || 0;

        // **Global Scores from passed arrays**
        const bm25ScoreGlobal = bm25ScoreGlobalMap.get(docId) || 0;
        const lmScoreGlobal = lmScoreGlobalMap.get(docId) || 0;

        // **Extract vector scores**
        const vectorScoresData = vectorScoreMap.get(docId) || {};
        const cosineTFIDFSimilarity = vectorScoresData.cosineTFIDFSimilarity || 0;
        const invertedEuclideanTFIDF = vectorScoresData.invertedEuclideanTFIDF || 0;

        // **Ranking score logic**
        let rankingScore = 0;
        if (enableRanking) {
            switch (rankingModel) {
                case "BM25":
                    rankingScore = bm25ScoreLocal || bm25ScoreGlobal;
                    break;
                case "LM":
                    rankingScore = lmScoreLocal || lmScoreGlobal;
                    break;
                case "cosineTFIDF":
                    rankingScore = cosineTFIDFSimilarity;
                    break;
                case "euclideanTFIDF":
                    rankingScore = invertedEuclideanTFIDF;
                    break;
                default:
                    rankingScore = bm25ScoreLocal || bm25ScoreGlobal;
            }
        }

        // **DEBUGGING: Log document ID and scores**
        console.log(`Processing document: ${docId}`);
        console.log(`Ranking Model: ${rankingModel}, Ranking Score: ${rankingScore}`);
        console.log(`BM25 Local: ${bm25ScoreLocal}, Global: ${bm25ScoreGlobal}`);
        console.log(`LM Local: ${lmScoreLocal}, Global: ${lmScoreGlobal}`);
        console.log(`TF-IDF Cosine: ${cosineTFIDFSimilarity}, TF-IDF Euclidean: ${invertedEuclideanTFIDF}`);

        return {
            ...doc,
            rankingScore,
            BM25ScoreLocal: bm25ScoreLocal,
            LanguageModelingScoreLocal: lmScoreLocal,
            LMScoreGlobal: lmScoreGlobal,
            BM25ScoreGlobal: bm25ScoreGlobal,
            cosineTFIDFSimilarity,
            invertedEuclideanTFIDF
        };
    });

    // **Sort by ranking score**
    return rankedDocuments.sort((a, b) => b.rankingScore - a.rankingScore);
}


function logMessage(message) {
    const now = new Date();
    const timestamp = now.toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    // Log to console
    console.log(logMessage);

    // Append to the log file
    const logFilePath = path.join(__dirname, "runtimes.log");
    fs.appendFileSync(logFilePath, logMessage + "\n");
}

const timers = {};
function startTimer(label) {
    timers[label] = process.hrtime();
}

function endTimer(label) {
    if (timers[label]) {
        const elapsed = process.hrtime(timers[label]);
        const elapsedMs = (elapsed[0] * 1e3 + elapsed[1] / 1e6).toFixed(2);
        const message = `Timer Ended: ${label} | Elapsed Time: ${elapsedMs}ms`;
        logMessage(message);
        delete timers[label];
        return elapsedMs;
    } else {
        logMessage(`Timer not found: ${label}`);
        return null
    }
}

function logResultsToFile(webid, query, results) {
    const filePath = path.join(__dirname, 'results-top-5-pods.txt');
    const runName = "my_run";

    // Sort results by score in descending order
    results.sort((a, b) => b.Score - a.Score);

    let formattedResults = [];
    let currentRank = 1;
    let previousScore = null;
    let count = 1;

    results.forEach((result) => {
        const match = result.Id.match(/:3000\/([^\/]+)\//);
        const podName = match ? match[1] : "unknown_pod";

        const score = result.Score;

        // Assign the same rank if the score is the same
        if (score !== previousScore) {
            currentRank = count;
        }

        formattedResults.push(`${webid} ${query} Q0 ${podName} ${currentRank} ${score} ${runName}`);

        previousScore = score;
        count++;
    });

    // Append results to file, followed by the separator
    fs.appendFileSync(filePath, formattedResults.join('\n') + '\n', 'utf8');
}
function logResults2ToFile(webid, query, results) {
    const filePath = path.join(__dirname, 'results-of-WebID4.txt');
    const runName = "my_run";

    // Sort results by score in descending order
    results.sort((a, b) => b.Score - a.Score);

    let formattedResults = [];
    let currentRank = 1;
    let previousScore = null;
    let count = 1;

    results.forEach((result) => {
        // Extract the file name from the URL
        const match = result.Id.match(/:3000\/([^\/]+)\/([^\/]+)$/);
        const filename = match ? match[2] : "unknown_file";

        const score = result.Score;

        // Assign the same rank if the score is the same
        if (score !== previousScore) {
            currentRank = count;
        }

        // Push the result in the desired format (including file name)
        formattedResults.push(`${filename}`);

        previousScore = score;
        count++;
    });

    // Append results to file, followed by the separator
    fs.appendFileSync(filePath, formattedResults.join('\n') + '\n', 'utf8');
}


app.get("/query", async (req, res) => {
    const argv = yargs
        .option("metaIndexName", {
            alias: "m",
            type: "string",
            description: "Name of the meta-index file",
            demandOption: true,
        })
        .option("overlayMetadata", {
            alias: "o",
            type: "boolean",
            description: "Enable or disable overlay metadata",
            default: false,
        })
        .option("serverLevelMetadata", {
            alias: "s",
            type: "boolean",
            description: "Enable or disable server-level metadata",
            default: false,
        })
        .option("resultsRanked", {
            alias: "r",
            type: "boolean",
            description: "Enable or disable results ranking",
            default: false,
        })
        .option("topKPodDocs", {
            alias: "k",
            type: "string",
            description: "Number of top results to retrieve from each pod",
            default: "",
        })
        .option("topKPods", {
            alias: "p",
            type: "string",
            description: "Number of top pods at each server",
            default: "",
        })
        .option("topKServers", {
            alias: "n",
            type: "string",
            description: "Number of top servers at each server",
            default: "",
        })
        .option("useBloomForServers", {
            alias: "b",
            type: "boolean",
            description: "Use Bloom filter for finding relevant servers",
            default: false,
        })
        .option("useBloomForPods", {
            alias: "c",
            type: "boolean",
            description: "Use Bloom filter for finding relevant pods",
            default: false,
        })
        .option("rankingmodelsourceselection", {
            alias: "M",
            type: "string",
            description: "Ranking model to use (BM25)",
            choices: ["BM25"]
        })
        .option("rankingmodeldocuments", {
            alias: "D",
            type: "string",
            description: "Ranking model to use (BM25 or LM)",
            choices: ["BM25", "LM","cosineTFIDF", "euclideanTFIDF"]
        })
        .option("accesslevel", {
            alias: "A",
            type: "string",
            description: "WebID Access Level",
            choices: ["5", "10", "25", "50", "100"]
        })
        .help()
        .argv;

    startTimer("TotalTime");

    const metaIndexName = argv.metaIndexName;
    const overlayMetadata = argv.overlayMetadata;
    const serverLevelMetadata = argv.serverLevelMetadata;
    const resultsRanked = argv.resultsRanked;
    const topKPodDocs = argv.topKPodDocs;
    const topKPods = argv.topKPods;
    const topKServers = argv.topKServers;
    const useBloomForServers=argv.useBloomForServers;
    const useBloomForPods=argv.useBloomForPods;
    const rankingmodelsourceselection = argv.rankingmodelsourceselection;
    const rankingmodeldocuments = argv.rankingmodeldocuments;
    const accesslevel=argv.accesslevel;


    const { keyword } = req.query;
    const [searchWord, webId] = keyword.includes(",") ? keyword.split(",") : [keyword, null];

    if (!searchWord || searchWord.trim() === "") {
        res.status(400).send("Invalid keyword");
        return;
    }

    logMessage(`Search Word: "${searchWord}"`);
    logMessage(`WebID: "${webId}"`);

    try {
        startTimer("FindRelevantServers");
        let relevantServers;


        if(useBloomForServers){
            relevantServers = await findRelevantServersWithBloom(searchWord,webId);
        } else {
            relevantServers = await findServersWithLucene(searchWord, webId, overlayMetadata,topKServers);
        }


        logMessage("Relevant Servers: " + JSON.stringify(relevantServers));
        endTimer("FindRelevantServers");

        const maxConcurrency = relevantServers.length > 0 ? Math.min(relevantServers.length, 25) : 1;
        const serverLimit = pLimit(maxConcurrency);
        //servers Batch Size
        const SERVER_BATCH_SIZE = Math.min(10, MAX_CONCURRENCY);

        let allIntegratedResults = [];

        const sortedServers = relevantServers.sort((a, b) => {
            const numA = parseInt(a.match(/srv(\d+)/)[1], 10);
            const numB = parseInt(b.match(/srv(\d+)/)[1], 10);
            return numA - numB;
        });

        for (let i = 0; i < sortedServers.length; i += SERVER_BATCH_SIZE) {
            const batch = sortedServers.slice(i, i + SERVER_BATCH_SIZE);

            await Promise.all(
                batch.map((server) =>
                    serverLimit(async () => {
                        try {
                            startTimer(`FindRelevantPods@__${server}`);
                            const relevantPods = useBloomForPods
                                ? await findRelevantPodsWithBloom(searchWord, webId, server)
                                : await findPodsWithLucene(
                                    webId,
                                    searchWord,
                                    server,
                                    metaIndexName,
                                    serverLevelMetadata,
                                    topKPods
                                );
                            logMessage(`No. SELECTED PODS from ${server}: ${relevantPods.length}`);
                            endTimer(`FindRelevantPods@__${server}`);

                            if (relevantPods.length > 0) {
                                startTimer(`CombineResults@__${server}`);
                                // const integratedResult = await integrateResults(relevantPods, webId, searchWord,topKPodDocs,"document");
                                const integratedResult = await integrateResults(relevantPods, webId, searchWord,topKPodDocs,"document",rankingmodeldocuments||undefined);
                                logMessage(`RowsFetched@__${server}: ${integratedResult.length}`);
                                allIntegratedResults.push(...integratedResult);
                                endTimer(`CombineResults@__${server}`);
                            }
                        } catch (error) {
                            logMessage(`Error processing server ${server}: ${error.message || error}`);
                        }
                    })
                )
            );
        }


        if (!rankingmodeldocuments)
        {
        startTimer("RankingResults@ALL");

        const finalResult = await handleResultsRankingUpdated(allIntegratedResults, resultsRanked,rankingmodeldocuments);
        logMessage(`RowsFetched@ALL: ${allIntegratedResults.length}`);
        endTimer("RankingResults@ALL");


        res.json(finalResult);
        }


        if(rankingmodeldocuments) {
            const documents = allIntegratedResults.reduce((acc, obj) => {
                return acc.concat(obj.documents);
            }, []);

            // console.log("All Results Flattened: " + JSON.stringify(documents));

            const vectoreScores = await calculateVectoreScores(searchWord, allIntegratedResults, accesslevel);
            // console.log("vectoreScores", vectoreScores);

            const bm25Scores = calculateBM25(searchWord, documents);
            // console.log("bm25Scores", bm25Scores);

            const lmScores = computeLMScores(searchWord, documents);
            // console.log("lmScores", lmScores);

            const finalResult = await handleResultsRankingUpdated(allIntegratedResults,resultsRanked,rankingmodeldocuments,vectoreScores,bm25Scores,lmScores)
            // console.log("finalResult", JSON.stringify(finalResult));

            res.json(finalResult);
        }

        endTimer("TotalTime");


    } catch (error) {
        logMessage(`Error during the overall process: ${error.message || error}`);
        res.status(500).send("An error occurred during processing.");
    }
});







////////////////// Specifically, FOR THE SEARCH APP UI //////////////////


//Working Custome-query But Old
// app.get("/custom-query", async (req, res) => {
//     const { keyword, webid, topKServers, topKPods, enableRanking } = req.query;
//
//     startTimer("TotalTime");
//     logMessage(`Custom Query - Search Word: "${keyword}", WebID: "${webid}", Enable Ranking: "${enableRanking}"`);
//
//     try {
//         startTimer("FindRelevantServers");
//         const relevantServers = await findServersWithLucene(keyword, webid, true, parseInt(topKServers) || "");
//         logMessage("Relevant Servers: " + JSON.stringify(relevantServers));
//         endTimer("FindRelevantServers");
//
//         const maxConcurrency = relevantServers.length > 0 ? Math.min(relevantServers.length, 25) : 1;
//         const serverLimit = pLimit(maxConcurrency);
//         const SERVER_BATCH_SIZE = Math.min(10, MAX_CONCURRENCY);
//         let allIntegratedResults = [];
//
//         // Check for valid server data before sorting
//         const sortedServers = relevantServers.filter((server) => server && server.match(/srv(\d+)/)).sort((a, b) => {
//             const numA = parseInt(a.match(/srv(\d+)/)[1], 10);
//             const numB = parseInt(b.match(/srv(\d+)/)[1], 10);
//             return numA - numB;
//         });
//
//         for (let i = 0; i < sortedServers.length; i += SERVER_BATCH_SIZE) {
//             const batch = sortedServers.slice(i, i + SERVER_BATCH_SIZE);
//
//             await Promise.all(
//                 batch.map((server) =>
//                     serverLimit(async () => {
//                         try {
//                             startTimer(`FindRelevantPods@__${server}`);
//                             const relevantPods = await findPodsWithLucene(
//                                 webid,
//                                 keyword,
//                                 server,
//                                 "metaindex",
//                                 true,
//                                 parseInt(topKPods) || ""
//                             );
//                             logMessage(`No. SELECTED PODS from ${server}: ${relevantPods.length}`);
//                             endTimer(`FindRelevantPods@__${server}`);
//
//                             if (relevantPods.length > 0) {
//                                 startTimer(`CombineResults@__${server}`);
//                                 const integratedResult = await integrateResults(relevantPods, webid, keyword, "");
//                                 logMessage(`RowsFetched@__${server}: ${integratedResult.length}`);
//                                 allIntegratedResults.push(...integratedResult);
//                                 endTimer(`CombineResults@__${server}`);
//                             }
//                         } catch (error) {
//                             logMessage(`Error processing server ${server}: ${error.message || error}`);
//                         }
//                     })
//                 )
//             );
//         }
//
//         // Only rank results if enableRanking is true
//         startTimer("RankingResults@ALL");
//         const enableRankingBool = enableRanking === "true";
//         const finalResult = await handleResultsRanking(allIntegratedResults, enableRankingBool);
//
//         logMessage(`RowsFetched@ALL: ${allIntegratedResults.length}`);
//         endTimer("RankingResults@ALL");
//
//         const totalTime = endTimer("TotalTime");
//         res.json({ results: finalResult, totalTime });
//
//
//     } catch (error) {
//         logMessage(`Custom Query Error: ${error.message}`);
//
//         // Ensure no further response after an error is thrown
//         if (!res.headersSent) {
//             res.status(500).send("Processing failed");
//         }
//     }
// });


app.get("/custom-query", async (req, res) => {
    const { keyword, webid, topKServers, topKPods, enableRanking } = req.query;
    const rankingmodeldocuments = req.query.rankingmodeldocuments;



    const serverPodMap = new Map();

    startTimer("TotalTime");
    logMessage(`Custom Query - Search Word: "${keyword}", WebID: "${webid}", Enable Ranking: "${enableRanking}"`);

    try {
        startTimer("FindRelevantServers");


        const relevantServers = await findServersWithLucene(keyword, webid, true, parseInt(topKServers) || "");
        // const relevantServers=["srv03912.soton.ac.uk:3000"];


        logMessage("Relevant Servers: " + JSON.stringify(relevantServers));
        endTimer("FindRelevantServers");

        const maxConcurrency = relevantServers.length > 0 ? Math.min(relevantServers.length, 25) : 1;
        const serverLimit = pLimit(maxConcurrency);
        const SERVER_BATCH_SIZE = Math.min(10, MAX_CONCURRENCY);
        let allIntegratedResults = [];

        // Process servers and track pod relationships
        const sortedServers = relevantServers.filter((server) => server && server.match(/srv(\d+)/)).sort((a, b) => {
            const numA = parseInt(a.match(/srv(\d+)/)[1], 10);
            const numB = parseInt(b.match(/srv(\d+)/)[1], 10);
            return numA - numB;
        });

        for (let i = 0; i < sortedServers.length; i += SERVER_BATCH_SIZE) {
            const batch = sortedServers.slice(i, i + SERVER_BATCH_SIZE);

            await Promise.all(
                batch.map((server) =>
                    serverLimit(async () => {
                        try {
                            startTimer(`FindRelevantPods@__${server}`);
                            const relevantPods = await findPodsWithLucene(
                                webid,
                                keyword,
                                server,
                                "vldb_metaindex.csv",
                                true,
                                parseInt(topKPods) || ""
                            );

                            // Store server-pod relationships
                            serverPodMap.set(server, relevantPods.map(pod => ({
                                name: pod.split('/').pop(), // Extract pod name
                                url: pod
                            })));

                            logMessage(`No. SELECTED PODS from ${server}: ${relevantPods.length}`);
                            endTimer(`FindRelevantPods@__${server}`);

                            if (relevantPods.length > 0) {
                                startTimer(`CombineResults@__${server}`);
                                // const integratedResult = await integrateResults(relevantPods, webid, keyword, "");
                                // console.log(">>",rankingmodeldocuments);
                                const integratedResult = await integrateResults(
                                    relevantPods,
                                    webid,
                                    keyword,
                                    "1",
                                    "document",
                                    rankingmodeldocuments || undefined // Pass the parameter here
                                );
                                logMessage(`RowsFetched@__${server}: ${integratedResult.length}`);
                                allIntegratedResults.push(...integratedResult);
                                endTimer(`CombineResults@__${server}`);
                            }
                        } catch (error) {
                            logMessage(`Error processing server ${server}: ${error.message || error}`);
                        }
                    })
                )
            );
        }

        // Convert Map to array for response
        const serverPodData = Array.from(serverPodMap.entries()).map(([url, pods]) => ({
            url,
            pods: pods.filter(p => p.url) // Remove empty entries
        }));

        startTimer("RankingResults@ALL");
        const enableRankingBool = enableRanking === "true";
        // const finalResult = await handleResultsRanking(allIntegratedResults, enableRankingBool);


        const documents = allIntegratedResults.reduce((acc, obj) => {
            return acc.concat(obj.documents);
        }, []);

        // console.log("All Results Flattened: " + JSON.stringify(documents));

        const vectoreScores = await calculateVectoreScores(keyword, allIntegratedResults, "5");
        // console.log("vectoreScores", vectoreScores);

        const bm25Scores = calculateBM25(keyword, documents);
        // console.log("bm25Scores", bm25Scores);

        const lmScores = computeLMScores(keyword, documents);
        // console.log("lmScores", lmScores);



        const finalResult = await handleResultsRankingUpdated(allIntegratedResults,enableRankingBool,rankingmodeldocuments,vectoreScores,bm25Scores,lmScores);

        logMessage(`RowsFetched@ALL: ${allIntegratedResults.length}`);
        endTimer("RankingResults@ALL");

        const totalTime = endTimer("TotalTime");

        res.json({
            results: finalResult,
            totalTime,
            serverPodData
        });

    } catch (error) {
        logMessage(`Custom Query Error: ${error.message}`);
        const totalTime = endTimer("TotalTime") || 0;

        if (!res.headersSent) {
            res.status(500).json({
                error: "Processing failed",
                totalTime,
                serverPodData: []
            });
        }
    }
});


//Working Filtered-query But Old
// app.get('/filtered-search', async (req, res) => {
//     const {
//         keyword,
//         webid,
//         selectedServers,
//         selectedPods,
//         topKServers,
//         topKPods,
//         enableRanking
//     } = req.query;
//
//     startTimer("TotalTime");
//
//     try {
//         // Parse selected resources
//         const selectedServersList = selectedServers ? selectedServers.split(',') : [];
//         const selectedPodsList = selectedPods ? selectedPods.split(',') : [];
//
//         // 1. Find relevant servers (filter if selections exist)
//         const servers = selectedServersList.length > 0
//             ? selectedServersList
//             : await findServersWithLucene(keyword, webid, true, topKServers);
//
//         // 2. Find pods for each server (filter if selections exist)
//         const allPods = [];
//         for (const server of servers) {
//             const pods = selectedPodsList.length > 0
//                 ? selectedPodsList.filter(p => p.startsWith(server))
//                 : await findPodsWithLucene(webid, keyword, server, "metaindex", true, topKPods);
//
//             allPods.push(...pods);
//         }
//
//         // 3. Integrate results from selected pods
//         const integratedResult = await integrateResults(allPods, webid, keyword, "");
//
//         // 4. Handle ranking
//         const enableRankingBool = enableRanking === "true";
//         const finalResult = await handleResultsRanking(integratedResult, enableRankingBool);
//
//         const totalTime = endTimer("TotalTime");
//
//         res.json({
//             results: finalResult,
//             totalTime: totalTime
//         });
//
//     } catch (error) {
//         endTimer("TotalTime");
//         res.status(500).json({
//             error: error.message,
//             totalTime: timers["TotalTime"] ? endTimer("TotalTime") : 0
//         });
//     }
// });


app.get('/filtered-search', async (req, res) => {
    const {
        keyword,
        webid,
        selectedServers,
        selectedPods,
        topKServers,
        topKPods,
        enableRanking,
        rankingmodeldocuments,
        accesslevel
    } = req.query;

    startTimer("TotalTime");

    try {
        // 1. Parse parameters with proper defaults
        // const rankingModel = rankingmodeldocuments && rankingmodeldocuments !== 'undefined'
        //     ? rankingmodeldocuments
        //     : null;
        const enableRankingBool = enableRanking === "true";

        // 2. Get selected resources
        const selectedServersList = selectedServers ? selectedServers.split(',') : [];
        const selectedPodsList = selectedPods ? selectedPods.split(',') : [];

        // 3. Always integrate with score calculations
        const allIntegratedResults = await integrateResults(
            selectedPodsList,
            webid,
            keyword,
            "1",
            "document",
            rankingmodeldocuments || undefined
        );


        const documents = allIntegratedResults.reduce((acc, obj) => {
            return acc.concat(obj.documents);
        }, []);

        // console.log("All Results Flattened: " + JSON.stringify(documents));

        const vectoreScores = await calculateVectoreScores(keyword, allIntegratedResults, "5");
        // console.log("vectoreScores", vectoreScores);

        const bm25Scores = calculateBM25(keyword, documents);
        // console.log("bm25Scores", bm25Scores);

        const lmScores = computeLMScores(keyword, documents);
        // console.log("lmScores", lmScores);


        const finalResult = await handleResultsRankingUpdated(allIntegratedResults,enableRankingBool,rankingmodeldocuments,vectoreScores,bm25Scores,lmScores);


        // 4. Extract and transform documents
        // const documents = integratedResult.flatMap(r =>
        //     (r.documents || []).map(d => {
        //         // Get vector scores for this document
        //         const vectorScores = vectorScoreMap.get(d.Id) || {};
        //
        //         return {
        //             ...d,
        //             BM25ScoreLocal: d.BM25Score || d.Score || 0,
        //             LanguageModelingScoreLocal: d.LanguageModelingScore || 0,
        //             // Add vector scores explicitly
        //             cosineTFIDFSimilarity: vectorScores.cosineTFIDFSimilarity || 0,
        //             invertedEuclideanTFIDF: vectorScores.invertedEuclideanTFIDF || 0,
        //             Id: d.Id
        //         }
        //     })
        // );

        // const vectorScores = await calculateVectoreScores(keyword, integratedResult, accesslevel || "5");
        // const vectorScoreMap = new Map(vectorScores.map(s => [s.docId, s]));

        // 5. Apply ranking if enabled
        // let finalResult = documents;
        // if (enableRankingBool && rankingModel) {
        //     const vectorScores = await calculateVectoreScores(keyword, integratedResult, accesslevel || "5");
        //     const bm25Scores = calculateBM25(keyword, documents);
        //     const lmScores = computeLMScores(keyword, documents);
        //
        //     finalResult = await handleResultsRankingUpdated(
        //         integratedResult,
        //         true,
        //         rankingModel,
        //         vectorScores,
        //         bm25Scores,
        //         lmScores
        //     );
        // }

        // 6. Ensure minimum result structure
        const safeResults = finalResult.map(item => ({
            Id: item.Id,
            BM25ScoreLocal: item.BM25ScoreLocal || 0,
            LanguageModelingScoreLocal: item.LanguageModelingScoreLocal || 0,
            cosineTFIDFSimilarity: item.cosineTFIDFSimilarity || 0,
            invertedEuclideanTFIDF: item.invertedEuclideanTFIDF || 0,
            Score: item.Score || 0,
            content: item.content || ""
        }));

        const totalTime = endTimer("TotalTime");

        res.json({
            results: safeResults,
            totalTime
        });

    } catch (error) {
        endTimer("TotalTime");
        res.status(500).json({
            error: error.message,
            totalTime: timers["TotalTime"] ? endTimer("TotalTime") : 0
        });
    }
});

app.get("/find-servers", async (req, res) => {
    const { keyword, webid, topKServers } = req.query;

    try {
        const servers = await findServersWithLucene(
            keyword,
            webid,
            true,
            topKServers || ""
        );

        res.json({ servers });
    } catch (error) {
        console.error("Error finding servers:", error);
        res.status(500).json({ error: "Server search failed" });
    }
});


app.get("/find-pods", async (req, res) => {
    const {
        keyword,
        webid,
        serverUrl,
        metaIndexName = "vldb_metaindex.csv",
        topKPods = 10
    } = req.query;

    try {
        const pods = await findPodsWithLucene(
            webid,
            keyword,
            serverUrl,
            metaIndexName,
            true,  // useServerMetadata
            parseInt(topKPods)
        );

        res.json({
            server: serverUrl,
            pods: pods,
            count: pods.length
        });
    } catch (error) {
        console.error("Pod search error:", error);
        res.status(500).json({
            error: "Pod search failed",
            details: error.message
        });
    }
});


app.listen(port, () => {
    console.log(`app (NEW) listening on port ${port}`);

});


