const https = require('https');
const axios = require('axios');
const fs = require('fs');
const { spawn } = require('child_process');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
const path = require('path');




// Set up the axios instance with the provided certificate and HTTPS agent
const certificate = fs.readFileSync('./ca.pem');
const httpsAgent = new https.Agent({ ca: certificate, rejectUnauthorized: false });
const axiosInstance = axios.create({ httpsAgent });


/**
 * Retrieves relevant data from a zip file and invokes the Lucene searcher Java process.
 *
 * @param {string} keyword - The keyword to search for.
 * @param {string} webid - The WebID to identify the source of data.
 * @param {string} zipUrl - The URL to download the zip file.
 * @returns {Promise<Object>} - A promise that resolves with the search results in JSON format.
 */
async function retrieveRelevantData_MB(keyword, webid, zipUrl, k) {
    // console.log(`Processing keyword "${keyword}" for WebID "${webid}"...`);

    try {
        const response = await axiosInstance({
            method: 'get',
            url: zipUrl,
            responseType: 'stream',
        });


        const javaProcess = spawn('java', [
            '-cp',
            'LuceneSearcher-1.0-SNAPSHOT.jar',
            'com.mycompany.searcher.LuceneSearcher',
            keyword,
            k
        ]);

        response.data.pipe(javaProcess.stdin);

        let resultData = '';

        javaProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        javaProcess.stderr.on('data', (data) => {
            console.error(`Java Process Error: ${data.toString()}`);
        });

        return new Promise((resolve, reject) => {
            javaProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const jsonResult = JSON.parse(resultData);
                        resolve(jsonResult);
                    } catch (error) {
                        reject(`Error parsing JSON result: ${error.message}`);
                    }
                } else {
                    reject(`Java process exited with code ${code}`);
                }
            });
        });
    } catch (error) {
        throw error;
    }
}






async function retrieveRelevantData_Overlay_Tweb(keyword, webid, model, zipPath, k,layer) {
    try {
        // Spawn the Java process
        const javaProcess = spawn('java', [
            '-Xmx8g',
            '-Xms4g',
            '-cp',
            'SearcherTweb-1.0-SNAPSHOT.jar',
            'com.mycompany.searcher.SearcherTweb',
            keyword,
            model,
            k,
            layer,
            zipPath
        ]);


        let resultData = '';

        console.log("ARE YOU HERE >>>!!");

        // Listen to stdout from Java process
        javaProcess.stdout.on('data', (data) => {
            console.log("ARE YOU HERE!!");
            resultData += data.toString();
        });



        // Log any errors from the Java process
        javaProcess.stderr.on('data', (data) => {
            console.error(`Java Process Error: ${data.toString()}`);
        });

        // Return a Promise that resolves when the Java process exits
        return new Promise((resolve, reject) => {
            javaProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const jsonResult = JSON.parse(resultData);
                        resolve(jsonResult);
                    } catch (error) {
                        reject(`Error parsing JSON result: ${error.message}`);
                    }
                } else {
                    reject(`Java process exited with code ${code}`);
                }
            });

            javaProcess.on('error', (error) => {
                reject(`Java Process Spawn Error: ${error.message}`);
            });
        });
    } catch (error) {
        console.error(`Error in retrieveRelevantData_Overlay: ${error.message}`);
        throw error;
    }
}

async function retrieveRelevantDataTweb(keyword, webid, zipUrl, k,layer, model) {
    try {

        // Fetch the ZIP file as a stream
        const response = await axiosInstance({
            method: 'get',
            url: zipUrl,
            responseType: 'stream',
        });


        // Spawn the Java process
        const javaProcess = spawn('java', [
            '-Xmx8g',
            '-Xms4g',
            '-cp',
            'SearcherTweb-1.0-SNAPSHOT.jar',
            'com.mycompany.searcher.SearcherTweb',
            keyword,
            model,
            k,
            layer
        ]);

        let resultData = '';

        // Listen to stdout from Java process
        javaProcess.stdout.on('data', async (data) => {
                resultData += data.toString();
        });

        // Log any errors from the Java process
        javaProcess.stderr.on('data', (data) => {
            console.error(`Java Process Error: ${data.toString()}`);
        });

        // Log when the ZIP stream ends
        response.data.on('end', () => {
            // console.log('Finished receiving ZIP file stream.');
        });

        // Handle stream errors
        response.data.on('error', (error) => {
            console.error(`Response Stream Error: ${error.message}`);
            javaProcess.kill(); // Kill Java process if the response stream fails
        });

        // Confirm piping to Java process
        javaProcess.stdin.on('error', (error) => {
            console.error(`Java Process Stdin Error: ${error.message}`);
        });
        javaProcess.stdin.on('finish', () => {
            // console.log('Finished piping ZIP stream to Java process.');
        });

        // Pipe the response stream to the Java process's stdin
        response.data.pipe(javaProcess.stdin);

        // Return a Promise that resolves when the Java process exits
        return new Promise((resolve, reject) => {
            javaProcess.on('close', (code) => {
                // console.log("Raw Result Data from Java:", resultData);
                if (code === 0) {
                    try {
                        const jsonResult = JSON.parse(resultData);
                        resolve(jsonResult);
                    } catch (error) {
                        // console.error(`Error parsing JSON result: ${error.message}`);
                        reject(`Error parsing JSON result: ${error.message}`);
                    }
                } else {
                    reject(`Java process exited with code ${code}`);
                }
            });

            javaProcess.on('error', (error) => {
                reject(`Java Process Spawn Error: ${error.message}`);
            });
        });
    } catch (error) {
        console.error(`Error in retrieveRelevantData: ${error.message}`);
        throw error;
    }
}


async function retrieveRelevantData(keyword, webid, zipUrl, k) {
    try {

        // Fetch the ZIP file as a stream
        const response = await axiosInstance({
            method: 'get',
            url: zipUrl,
            responseType: 'stream',
        });


        // Spawn the Java process
        const javaProcess = spawn('java', [
            '-Xmx8g',
            '-Xms4g',
            '-cp',
            'LuceneSearcher-1.0-SNAPSHOT.jar',
            'com.mycompany.searcher.LuceneSearcher',
            keyword,
            k,
        ]);

        let resultData = '';

        // Listen to stdout from Java process
        javaProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        // Log any errors from the Java process
        javaProcess.stderr.on('data', (data) => {
            console.error(`Java Process Error: ${data.toString()}`);
        });

        // Log when the ZIP stream ends
        response.data.on('end', () => {
            // console.log('Finished receiving ZIP file stream.');
        });

        // Handle stream errors
        response.data.on('error', (error) => {
            console.error(`Response Stream Error: ${error.message}`);
            javaProcess.kill(); // Kill Java process if the response stream fails
        });

        // Confirm piping to Java process
        javaProcess.stdin.on('error', (error) => {
            console.error(`Java Process Stdin Error: ${error.message}`);
        });
        javaProcess.stdin.on('finish', () => {
            // console.log('Finished piping ZIP stream to Java process.');
        });

        // Pipe the response stream to the Java process's stdin
        response.data.pipe(javaProcess.stdin);

        // Return a Promise that resolves when the Java process exits
        return new Promise((resolve, reject) => {
            javaProcess.on('close', (code) => {
                // console.log("Raw Result Data from Java:", resultData);
                if (code === 0) {
                    try {
                        const jsonResult = JSON.parse(resultData);
                        resolve(jsonResult);
                    } catch (error) {
                        // console.error(`Error parsing JSON result: ${error.message}`);
                        reject(`Error parsing JSON result: ${error.message}`);
                    }
                } else {
                    reject(`Java process exited with code ${code}`);
                }
            });

            javaProcess.on('error', (error) => {
                reject(`Java Process Spawn Error: ${error.message}`);
            });
        });
    } catch (error) {
        console.error(`Error in retrieveRelevantData: ${error.message}`);
        throw error;
    }
}


async function retrieveRelevantData_Overlay(keyword, webid, zipPath, k) {
    try {
        // Spawn the Java process
        const javaProcess = spawn('java', [
            '-Xmx8g',
            '-Xms4g',
            '-cp',
            'LuceneSearcherOverlay-1.0-SNAPSHOT.jar',
            'com.mycompany.searcher.LuceneSearcherOverlay',
            keyword,
            k,
            zipPath
        ]);


        let resultData = '';

        // Listen to stdout from Java process
        javaProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        // Log any errors from the Java process
        javaProcess.stderr.on('data', (data) => {
            console.error(`Java Process Error: ${data.toString()}`);
        });

        // Return a Promise that resolves when the Java process exits
        return new Promise((resolve, reject) => {
            javaProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const jsonResult = JSON.parse(resultData);
                        resolve(jsonResult);
                    } catch (error) {
                        reject(`Error parsing JSON result: ${error.message}`);
                    }
                } else {
                    reject(`Java process exited with code ${code}`);
                }
            });

            javaProcess.on('error', (error) => {
                reject(`Java Process Spawn Error: ${error.message}`);
            });
        });
    } catch (error) {
        console.error(`Error in retrieveRelevantData_Overlay: ${error.message}`);
        throw error;
    }
}


function calculateMinMax(scores) {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    return { min, max };
}

// Function to normalize a score using Min-Max normalization
function normalizeScore(score, min, max) {
    if (min === max) {
        console.warn(`Min and Max are equal (${min}). Assigning normalizedScore as 0.`);
        return 0;
    }
    return (score - min) / (max - min);
}

// Function to calculate the mean of an array
function calculateMean(scores) {
    const sum = scores.reduce((acc, score) => acc + score, 0);
    return sum / scores.length;
}

// Function to calculate standard deviation of an array
function calculateStdDev(scores, mean) {
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
}

// Function to calculate Z-score for an individual score
function calculateZScore(score, mean, stdDev) {
    if (stdDev === 0) {
        console.warn('Standard deviation is 0. Assigning Z-score as 0.');
        return 0;
    }
    return (score - mean) / stdDev;
}

// Function to rank documents with totalHits === 1 by score
function rankSingleHitResults(singleHitResults) {
    return singleHitResults.flatMap(resultSet => resultSet[0].documents)
        .sort((a, b) => parseFloat(b.Score) - parseFloat(a.Score));
}

// Function to handle results with totalHits > 1
function processMultiHitResults(multiHitResults) {

        const normalizedMultiHitResults = multiHitResults.map(resultSet => {
            const scores = resultSet[0].documents
                .map(doc => parseFloat(doc.Score))
                .filter(score => !isNaN(score));

            if (scores.length === 0) {
                console.error('No valid scores in documents.');
                return resultSet[0];
            }

            const min = Math.min(...scores);
            const max = Math.max(...scores);

            return {
                ...resultSet[0],
                documents: resultSet[0].documents.map(doc => {
                    const parsedScore = parseFloat(doc.Score);
                    const normalizedScore = !isNaN(parsedScore) ? normalizeScore(parsedScore, min, max) : NaN;
                    return {...doc, normalizedScore};
                })
            };
        });

        const allNormalizedScores = normalizedMultiHitResults.flatMap(resultSet =>
            resultSet.documents.map(doc => doc.normalizedScore).filter(score => !isNaN(score))
        );

        if (allNormalizedScores.length === 0) {
            console.error('No valid normalized scores found.');
            return [];
        }

        const mean = calculateMean(allNormalizedScores);
        const stdDev = calculateStdDev(allNormalizedScores, mean);

        return normalizedMultiHitResults.flatMap(resultSet =>
            resultSet.documents.map(doc => {
                const zScore = !isNaN(doc.normalizedScore) ? calculateZScore(doc.normalizedScore, mean, stdDev) : NaN;
                return {...doc, zScore};
            })
        ).sort((a, b) => b.zScore - a.zScore);

}



function processMultiHitResultsCentralized(multiHitResults) {
    const normalizedMultiHitResults = multiHitResults.flatMap(resultSet => {
        // Assuming resultSet is an array and resultSet[0] is where the `documents` are
        const documents = resultSet[0]?.documents || [];

        if (documents.length === 0) {
            console.error('No documents found in resultSet.');
            return [];
        }

        // Extract scores from documents and normalize
        const scores = documents
            .map(doc => parseFloat(doc.Score))
            .filter(score => !isNaN(score));

        if (scores.length === 0) {
            console.error('No valid scores in documents.');
            return [];
        }

        const min = Math.min(...scores);
        const max = Math.max(...scores);

        return {
            ...resultSet[0], // Retain the rest of the metadata (if necessary)
            documents: documents.map(doc => {
                const parsedScore = parseFloat(doc.Score);
                const normalizedScore = !isNaN(parsedScore) ? normalizeScore(parsedScore, min, max) : NaN;
                return {...doc, normalizedScore};
            })
        };
    });

    // Flatten all normalized scores
    const allNormalizedScores = normalizedMultiHitResults.flatMap(resultSet =>
        resultSet.documents.map(doc => doc.normalizedScore).filter(score => !isNaN(score))
    );

    if (allNormalizedScores.length === 0) {
        console.error('No valid normalized scores found.');
        return [];
    }

    const mean = calculateMean(allNormalizedScores);
    const stdDev = calculateStdDev(allNormalizedScores, mean);

    return normalizedMultiHitResults.flatMap(resultSet =>
        resultSet.documents.map(doc => {
            const zScore = !isNaN(doc.normalizedScore) ? calculateZScore(doc.normalizedScore, mean, stdDev) : NaN;
            return {...doc, zScore};
        })
    ).sort((a, b) => b.zScore - a.zScore);
}




// Function to merge, normalize, and re-rank results
function mergeAndRerank(results) {
    // Separate results with totalHits === 1 and totalHits > 1
    const singleHitResults = results.filter(resultSet => resultSet[0].totalHits === 1);
    const multiHitResults = results.filter(resultSet => resultSet[0].totalHits > 1);

    // Rank single-hit results by score
    const rankedSingleHitResults = rankSingleHitResults(singleHitResults);

    const rankedMultiHitResults =[];
    if(multiHitResults.length>0) {
        // Process and rank multi-hit results
        const rankedMultiHitResults = processMultiHitResults(multiHitResults);
    }

    // Combine ranked results
    return [...rankedSingleHitResults, ...rankedMultiHitResults];
}


function mergeAndRerankCentralized(results) {
    // Separate results with totalHits > 1
    let multiHitResults = results
        .filter(resultSet => resultSet[0] && resultSet[0].totalHits > 1);

    let rankedMultiHitResults;
    rankedMultiHitResults = processMultiHitResultsCentralized(multiHitResults);

    return rankedMultiHitResults;
}












// async function getData() {
//     try {
//         const data = await retrieveRelevantData("omega729", "httpexampleorgsagent3profilecardme", "https://srv03945.soton.ac.uk:3000/ESPRESSO/metaindex/httpexampleorgagent227profilecardme-servers.zip", "");
//         console.log(data);
//     } catch (error) {
//         console.error(`Error: ${error}`);
//     }
// }

async function getDataOverlay() {
    try {
        const data = await retrieveRelevantData_Overlay("childhood inhaler", "httpexampleorgsagent0profilecardme", "/Users/ragab/index.zip", "");
        console.log(JSON.stringify(data,null,2));
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}


async function getDataOverlay2() {
    console.time('getDataOverlayExecutionTime');
    try {
        const rawData = await retrieveRelevantData_Overlay(
            "childhood",
            "httpexampleorgsagent3profilecardme",
            "/Users/ragab/Downloads/lucene_index.zip",
            ""
        );

        console.log("Raw data received:", rawData);  // Log raw data

        // Determine if rawData is a string or an object
        if (typeof rawData === "string") {
            try {
                const data = JSON.parse(rawData);
                console.log("Parsed JSON data:", JSON.stringify(data, null, 2));
            } catch (parseError) {
                console.error("Error parsing JSON:", parseError);
            }
        } else if (typeof rawData === "object" && rawData !== null) {
            console.log("Received valid object:", JSON.stringify(rawData, null, 2));
        } else {
            console.error("Received empty or invalid JSON data.");
        }
    } catch (error) {
        console.error(`Error: ${error}`);
    }
    console.timeEnd('getDataOverlayExecutionTime');
}

// getDataOverlay2();





// async function getDataOverlay2() {
//     console.time('getDataOverlayExecutionTime');
//     try {
//         const baseDir = path.resolve(__dirname, '../pod-level/');
//         const regexPattern = /^srv03\d{3}\.soton\.ac\.uk_3000\/httpexampleorgagent4profilecardme-pods\.zip$/;
//
//         // Find all relevant zip files
//         const directories = fs.readdirSync(baseDir)
//             .filter(dir => regexPattern.test(dir)) // Match pattern
//             .map(dir => path.join(baseDir, dir)); // Get full path
//
//         console.log("Identified ZIP files:", directories);
//
//         let aggregatedResults = [];
//
//         for (const zipPath of directories) {
//             try {
//                 const rawData = await retrieveRelevantData_Overlay(
//                     "childhood",
//                     "httpexampleorgagent4profilecardme",
//                     zipPath,
//                     ""
//                 );
//
//                 // Ensure rawData is parsed correctly
//                 let data;
//                 if (typeof rawData === "string") {
//                     data = JSON.parse(rawData);
//                 } else {
//                     data = rawData;
//                 }
//
//                 if (data && Array.isArray(data)) {
//                     aggregatedResults.push(...data);
//                 }
//             } catch (error) {
//                 console.error(`Error processing ${zipPath}:`, error);
//             }
//         }
//
//         console.log("Final Aggregated Results:", JSON.stringify(aggregatedResults, null, 2));
//     } catch (error) {
//         console.error(`Error: ${error}`);
//     }
//     console.timeEnd('getDataOverlayExecutionTime');
// }

// getDataOverlay2();
//








// async function getDataOverlay_FileLevel() {
//     console.time('getDataOverlayExecutionTime');
//     try {
//         const baseDir = path.resolve("//Users/ragab/Downloads/tes/httpexampleorgagent9profilecardme/file-level");
//
//         let zipFiles = [];
//
//         // Iterate over server directories (e.g., srv03950.soton.ac.uk_3000)
//         const serverDirs = fs.readdirSync(baseDir)
//             .map(dir => path.join(baseDir, dir)) // Get full paths
//             .filter(dir => fs.lstatSync(dir).isDirectory()); // Ensure they are directories
//
//         for (const serverDir of serverDirs) {
//             // Look inside subdirectories (e.g., vldb_pod50-XXXX)
//             const subDirs = fs.readdirSync(serverDir)
//                 .map(subDir => path.join(serverDir, subDir))
//                 .filter(subDir => fs.lstatSync(subDir).isDirectory()); // Ensure they are directories
//
//             for (const subDir of subDirs) {
//                 // Find ZIP files inside these directories
//                 const zips = fs.readdirSync(subDir)
//                     .filter(file => file.endsWith('.zip'))
//                     .map(file => path.join(subDir, file));
//
//                 zipFiles.push(...zips);
//             }
//         }
//
//         console.log("Identified File-Level ZIP files:", zipFiles);
//
//         let aggregatedResults = [];
//
//         for (const zipPath of zipFiles) {
//             try {
//                 const rawData = await retrieveRelevantData_Overlay(
//                     "childhood",
//                     "httpexampleorgagent192profilecardme",
//                     zipPath,
//                     ""
//                 );
//
//                 let data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
//
//                 if (data && Array.isArray(data)) {
//                     aggregatedResults.push(...data);
//                 }
//             } catch (error) {
//                 console.error(`Error processing ${zipPath}:`, error);
//             }
//         }
//
//         console.log("Final Aggregated Results:", JSON.stringify(aggregatedResults, null, 2));
//     } catch (error) {
//         console.error(`Error: ${error}`);
//     }
//     console.timeEnd('getDataOverlayExecutionTime');
// }
//
// // Run function
// getDataOverlay_FileLevel();


// async function getDataOverlay3() {
//     console.time('getDataOverlayExecutionTime');
//     try {
//         const baseDir = path.resolve("/Users/ragab/Downloads/tes/httpexampleorgagent9profilecardme/pod-level/");
//         const zipFilenamePattern = /-pods\.zip$/; // Matches ZIP files ending with "-pods.zip"
//
//         let aggregatedResults = [];
//
//         // Get all directories under baseDir
//         const directories = fs.readdirSync(baseDir)
//             .map(name => path.join(baseDir, name))
//             .filter(fullPath => fs.statSync(fullPath).isDirectory()); // Ensure it's a directory
//
//         console.log("Identified directories:", directories);
//
//         for (const dirPath of directories) {
//             try {
//                 // Find ZIP files inside the directory
//                 const zipFiles = fs.readdirSync(dirPath)
//                     .filter(file => zipFilenamePattern.test(file)) // Match ZIP pattern
//                     .map(file => path.join(dirPath, file)); // Get full ZIP file path
//
//                 if (zipFiles.length === 0) {
//                     console.warn(`No ZIP files found in ${dirPath}`);
//                     continue; // Skip if no ZIPs found
//                 }
//
//                 for (const zipPath of zipFiles) {
//                     try {
//                         const rawData = await retrieveRelevantData_Overlay(
//                             "childhood inhaler",
//                             "httpexampleorgagent9profilecardme",
//                             zipPath, // Now correctly passing ZIP file path
//                             "5"
//                         );
//
//                         // Ensure rawData is parsed correctly
//                         let data;
//                         if (typeof rawData === "string") {
//                             data = JSON.parse(rawData);
//                         } else {
//                             data = rawData;
//                         }
//
//                         if (data && Array.isArray(data)) {
//                             aggregatedResults.push(...data);
//                         }
//                     } catch (error) {
//                         console.error(`Error processing ${zipPath}:`, error);
//                     }
//                 }
//             } catch (error) {
//                 console.error(`Error reading directory ${dirPath}:`, error);
//             }
//         }
//
//         console.log("Final Aggregated Results:", JSON.stringify(aggregatedResults, null, 2));
//         console.log("Final Aggregated Results: ", aggregatedResults.length)
//     } catch (error) {
//         console.error(`Error: ${error}`);
//     }
//     console.timeEnd('getDataOverlayExecutionTime');
// }






// ---- TEST CASE  SERVER LEVEL----
// (async () => {
//     try {
//         const keyword = "heart";   // Replace with a test keyword
//         const webid = "httpexampleorgagent9profilecardme"; // Replace with a test WebID
//         const model = "BM25";
//         const zipPath="/usr/local/srv/ESPRESSO_HOliver_fork/Ragab/Automation/server-level/httpexampleorgagent9profilecardme-servers.zip";
//         const layer="server";
//
//         const k = 2;
//
//         console.log("Testing retrieveRelevantDataTweb LOCALLY...");
//         const result = await retrieveRelevantData_Overlay_Tweb(keyword, webid, model, zipPath, k,layer);
//         console.log("Result:", result);
//     } catch (error) {
//         console.error("Test failed:", error);
//     }
// })();


// (async () => {
//     try {
//         const keyword = "heart";   // Replace with a test keyword
//         const webid = "httpexampleorgagent4profilecardme"; // Replace with a test WebID
//         const model = "LM";
//         const zipUrl="https://srv03812.soton.ac.uk:3000/ESPRESSO/metaindex/httpexampleorgagent4profilecardme-pods.zip";
//         const layer="pods";
//
//         const k = 2;
//
//         console.log("Testing retrieveRelevantDataTweb PODS...");
//         const result = await retrieveRelevantDataTweb(keyword, webid, model, zipUrl, k,layer);
//
//         console.log("Search Results:", JSON.stringify(result, null, 2));
//
//     } catch (error) {
//         console.error("Test failed:", error);
//     }
// })();


module.exports = {
    retrieveRelevantData,
    retrieveRelevantData_Overlay,
    mergeAndRerank,
    mergeAndRerankCentralized,
    retrieveRelevantDataTweb
};


