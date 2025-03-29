// Import from "@inrupt/solid-client-authn-browser"
// import {
//   login,
//   handleIncomingRedirect,
//   getDefaultSession,
//   fetch
// } from "@inrupt/solid-client-authn-browser";

// Import from "@inrupt/solid-client"
import {
  createSolidDataset,
  getPodUrlAll,
  fetch as solidFetch
} from "@inrupt/solid-client";

let selectedResources = { servers: new Set(), pods: new Set() };
let totalSearchTime = 0;
let resultsData = [];

let currentPage = 1;
const resultsPerPage = 5;

// Set up the event listener for the search form
// document.addEventListener('DOMContentLoaded', function() {
//   document.getElementById('searchForm').addEventListener('submit', function(event) {
//     event.preventDefault();
//     search(false);
//   });
// });


// const webIDMapping = {
//   "WebID1--5% Access": "httpexampleorgagent9profilecardme",
//   "WebID2--10% Access": "httpexampleorgsagent3profilecardme",
//   "WebID3--25% Access": "httpexampleorgsagent2profilecardme",
//   "WebID4--50% Access": "httpexampleorgsagent1profilecardme",
//   "WebID5--100% Access": "httpexampleorgsagent0profilecardme"
// };
//
// document.getElementById('webIDInput').addEventListener('input', function(e) {
//   const inputValue = e.target.value;
//   const realWebID = webIDMapping[inputValue] || inputValue;
//   document.getElementById('webID').value = realWebID;
// });


document.addEventListener("DOMContentLoaded", function () {
  const statsLink = document.getElementById("statsLink");
  const statsPopup = document.querySelector(".stats-popup");

  if (statsLink && statsPopup) {
    statsLink.addEventListener("click", function (event) {
      event.stopPropagation(); // Prevent the click from propagating to document
      statsPopup.classList.toggle("visible");
    });

    document.addEventListener("click", function (event) {
      if (!statsPopup.contains(event.target) && event.target !== statsLink) {
        statsPopup.classList.remove("visible");
      }
    });

    // Ensure the popup closes if it is open when pressing the Escape key
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        statsPopup.classList.remove("visible");
      }
    });
  }
});



document.getElementById('webIDInput').addEventListener('focus', function() {
  document.getElementById('webIDDropdown').style.display = 'block';
});

document.getElementById('webIDInput').addEventListener('blur', function() {
  setTimeout(() => {
    document.getElementById('webIDDropdown').style.display = 'none';
  }, 200);
});

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('mousedown', (e) => {
    const displayText = e.target.textContent.trim();
    const realValue = e.target.dataset.value;
    document.getElementById('webIDInput').value = displayText;
    document.getElementById('webID').value = realValue;
  });
});


document.getElementById('settingsButton').addEventListener('click', function(e) {
  e.preventDefault();
  const advancedOptions = document.querySelector('.advanced-options');
  advancedOptions.classList.toggle('visible');
  this.classList.toggle('active');

  // Optional: rotate the cog icon
  const icon = this.querySelector('i');
  icon.style.transform = icon.style.transform === 'rotate(90deg)' ? 'none' : 'rotate(90deg)';
});


// Allow custom input
document.getElementById('webIDInput').addEventListener('input', function(e) {
  const customValue = e.target.value;
  document.getElementById('webID').value = customValue;
});

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('searchForm').addEventListener('submit', function(event) {
    event.preventDefault();
    search(false);
  });

  document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('selectionModal').style.display = 'none';
  });

  window.onclick = (event) => {
    const modal = document.getElementById('selectionModal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };

  document.getElementById('confirmSearch').addEventListener('click', () => {
    document.getElementById('selectionModal').style.display = 'none';
    search(true);
  });
});



document.getElementById('enableRanking').addEventListener('change', function(e) {
  const popup = document.querySelector('.ranking-options-popup');


  if (this.checked) {
    popup.classList.add('visible');
    this.checked = true; // Ensure main checkbox remains checked
  } else {
    popup.classList.remove('visible');
    document.getElementById('rankBM25').checked = false;
    document.getElementById('rankLM').checked = false;
    document.getElementById('rankCosineTFIDF').checked=false;
    document.getElementById('rankEuclideanTFIDF').checked=false;
    updateRankResultsText();
  }
});

// Close popup when clicking outside
document.addEventListener('click', (e) => {
  const popup = document.querySelector('.ranking-options-popup');
  const rankCheckbox = document.getElementById('enableRanking');

  if (!e.target.closest('.rank-results') && popup.classList.contains('visible')) {
    popup.classList.remove('visible');

    // Check if any sub-option is selected
    const bm25Checked = document.getElementById('rankBM25').checked;
    const lmChecked = document.getElementById('rankLM').checked;

    // Keep main checkbox checked only if at least one sub-option is checked
    rankCheckbox.checked = bm25Checked || lmChecked;

    updateRankResultsText(); // Update text based on selection
  }
});

function updateRankResultsText() {
  const enableRankingCheckbox = document.getElementById('enableRanking');
  const rankResultsLabel = document.getElementById('rankResultsLabel');
  // Check if any ranking model is selected

  const anyModelSelected = document.querySelectorAll('.ranking-option input[type="radio"]:checked').length > 0;

  enableRankingCheckbox.checked = anyModelSelected;

  const bm25Checked = document.getElementById('rankBM25').checked;
  const lmChecked = document.getElementById('rankLM').checked;
  const cosineTFIDFChecked = document.getElementById('rankCosineTFIDF').checked;
  const euclideanTFIDFChecked = document.getElementById('rankEuclideanTFIDF').checked;


  let selectedParts = [];
  if (bm25Checked) selectedParts.push("BM25");
  if (lmChecked) selectedParts.push("LM");
  if (cosineTFIDFChecked) selectedParts.push("CosineTFIDF");
  if (euclideanTFIDFChecked) selectedParts.push("EuclideanTFIDF");

  let selectedText = "";
  if (selectedParts.length > 0) {
    selectedText = `(${selectedParts.join(", ")})`;
    rankResultsLabel.innerHTML = `Rank Results <span style="color: dodgerblue;">${selectedText}</span>`;
  } else {
    rankResultsLabel.textContent = "Rank Results";
  }

}

// Attach event listeners to sub-options to update text on change
document.getElementById('rankBM25').addEventListener('change', updateRankResultsText);
document.getElementById('rankLM').addEventListener('change', updateRankResultsText);

document.getElementById('rankCosineTFIDF').addEventListener('change', function() {
  document.getElementById('enableRanking').checked = this.checked;
  updateRankResultsText();
});

document.getElementById('rankEuclideanTFIDF').addEventListener('change', function() {
  document.getElementById('enableRanking').checked = this.checked;
  updateRankResultsText();
});






// WORKING AND EVERYTHING IS PERFECT HERE
// async function search() {
//   const keyword = document.getElementById("keyword").value;
//   const webId = document.getElementById("webID").value;
//   const topServers = document.getElementById("topServers").value || "";
//   const topPods = document.getElementById("topPods").value || "";
//   const enableRanking = document.getElementById("enableRanking").checked ? "true" : "false";  // Get the checkbox status
//
//
//   const searchButton = document.querySelector('button[type="searchbutton"]');
//   const loadingSpinner = document.querySelector('.loading-spinner');
//
//   try {
//     // Show loading state
//     document.body.classList.add('search-disabled');
//     loadingSpinner.style.display = 'block';
//     searchButton.disabled = true;
//
//     const response = await fetch(
//         `http://localhost:8080/custom-query?` + new URLSearchParams({
//           keyword: keyword,
//           webid: webId,
//           topKServers: topServers,
//           topKPods: topPods,
//           enableRanking: enableRanking // Add enableRanking to the query string
//         })
//     );
//
//     if (!response.ok) throw new Error('Search failed');
//
//     const result = await response.json();
//
//     resultsData = result.results;
//     totalSearchTime = result.totalTime;
//
//     displayResults(result.results);
//   } catch (error) {
//     console.error('Error:', error);
//   } finally {
//     // Always clear loading state
//     document.body.classList.remove('search-disabled');
//     loadingSpinner.style.display = 'none';
//     searchButton.disabled = false;
//   }
//
// }



async function search(useSelections = false) {
  const keyword = document.getElementById("keyword").value;
  const webId = document.getElementById("webID").value;
  const topServers = document.getElementById("topServers").value || "";
  const topPods = document.getElementById("topPods").value || "";
  const enableRanking = document.getElementById("enableRanking").checked ? "true" : "false";
  const enableSources = document.getElementById("enableSources").checked;

  const searchButton = document.querySelector('button[type="searchbutton"]');
  const loadingSpinner = document.querySelector('.loading-spinner');

  try {
    showLoadingState(true);


    // Determine selected ranking models
    // const rankBM25Checked = document.getElementById('rankBM25').checked;
    // const rankLMChecked = document.getElementById('rankLM').checked;
    // const rankingModels = [];
    // if (rankBM25Checked) rankingModels.push('BM25');
    // if (rankLMChecked) rankingModels.push('LM');
    // const rankingmodeldocuments = rankingModels.length > 0 ? rankingModels.join(',') : undefined;

    // Get the selected radio button value
    const selectedRankingModel = document.querySelector('input[name="rankingModel"]:checked')?.value;
    const rankingmodeldocuments = selectedRankingModel || undefined;

    const params = {
      keyword,
      webid: webId,
      topKServers: topServers,
      topKPods: topPods,
      enableRanking,
      rankingmodeldocuments
    };

    if(useSelections) {
      params.selectedServers = Array.from(selectedResources.servers).join(',');
      params.selectedPods = Array.from(selectedResources.pods).join(',');
    }

    const endpoint = useSelections ? 'filtered-search' : 'custom-query';
    const response = await fetch(
        `http://localhost:8080/${endpoint}?` + new URLSearchParams(params)
    );



    if (!response.ok) throw new Error('Search failed');
    const result = await response.json();



    if(!useSelections) {
      if(enableSources) {
        showServerSelection(result.serverPodData);
        window.initialResults=result.results;

        window.serverPodData = result.serverPodData;
      }
      else {
        window.serverPodData = result.serverPodData;
        window.initialResults = result.results;
        resultsData = result.results;
        totalSearchTime = result.totalTime;
        displayResults(result.results);
      }

    } else {
      resultsData = result.results;
      totalSearchTime = result.totalTime;
      displayResults(result.results);
    }

  } catch (error) {
    console.error('Error:', error);
    alert('Search failed: ' + error.message);
  } finally {
    showLoadingState(false);
  }
}


function showLoadingState(show) {
  const searchButton = document.querySelector('button[type="searchbutton"]');
  const loadingSpinner = document.querySelector('.loading-spinner');
  document.body.classList.toggle('search-disabled', show);
  loadingSpinner.style.display = show ? 'block' : 'none';
  searchButton.disabled = show;
}

function showServerSelection(serverPodData) {
  const container = document.getElementById('serverList');
  container.innerHTML = serverPodData.map(server => `
    <div class="server-card">
      <div class="server-header" data-server="${server.url}">
        <i class="fas fa-server server-icon"></i>
        <h3>${server.url.replace(/\.soton\.ac\.uk:3000$/, '')}</h3>
        <input type="checkbox" class="server-checkbox" 
               ${selectedResources.servers.has(server.url) ? 'checked' : ''}>
      </div>
      <div class="pod-list">
        ${server.pods.map(pod => `
          <div class="pod-item">
            <i class="fas fa-cube pod-icon"></i>
            <span>${pod.name}</span>
            <input type="checkbox" class="pod-checkbox" 
                   data-server="${server.url}"
                   data-pod="${pod.url}"
                   ${selectedResources.pods.has(pod.url) ? 'checked' : ''}>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.server-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleServerSelection);
  });

  document.querySelectorAll('.pod-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handlePodSelection);
  });

  document.getElementById('selectionModal').style.display = 'block';
}

// function handleServerSelection(event) {
//   const server = event.target.closest('.server-header').dataset.server;
//   const pods = Array.from(event.target.closest('.server-card')
//       .querySelectorAll('.pod-checkbox'));
//
//   if(event.target.checked) {
//     selectedResources.servers.add(server);
//     pods.forEach(pod => {
//       selectedResources.pods.add(pod.dataset.pod);
//       pod.checked = true;
//     });
//   } else {
//     selectedResources.servers.delete(server);
//     pods.forEach(pod => {
//       selectedResources.pods.delete(pod.dataset.pod);
//       pod.checked = false;
//     });
//   }
// }

function handleServerSelection(event) {
  const server = event.target.closest('.server-header').dataset.server;
  const pods = Array.from(event.target.closest('.server-card')
      .querySelectorAll('.pod-checkbox'));

  if(event.target.checked) {
    // Select all pods when server is checked
    pods.forEach(pod => {
      selectedResources.pods.add(pod.dataset.pod);
      pod.checked = true;
    });
    selectedResources.servers.add(server);
  } else {
    // Deselect all pods when server is unchecked
    pods.forEach(pod => {
      selectedResources.pods.delete(pod.dataset.pod);
      pod.checked = false;
    });
    selectedResources.servers.delete(server);
  }
}

// function handlePodSelection(event) {
//   const pod = event.target.dataset.pod;
//   const server = event.target.dataset.server;
//   const serverCheckbox = event.target.closest('.server-card')
//       .querySelector('.server-checkbox');
//
//   if(event.target.checked) {
//     selectedResources.pods.add(pod);
//   } else {
//     selectedResources.pods.delete(pod);
//   }
//
//   // Update server checkbox state
//   const allPodsChecked = Array.from(event.target.closest('.pod-list')
//       .querySelectorAll('.pod-checkbox'))
//       .every(cb => cb.checked);
//
//   serverCheckbox.checked = allPodsChecked;
//   allPodsChecked ? selectedResources.servers.add(server)
//       : selectedResources.servers.delete(server);
// }

function handlePodSelection(event) {
  const pod = event.target.dataset.pod;
  const server = event.target.dataset.server;
  const serverCheckbox = event.target.closest('.server-card')
      .querySelector('.server-checkbox');

  if(event.target.checked) {
    selectedResources.pods.add(pod);
  } else {
    selectedResources.pods.delete(pod);
  }

  // Update server checkbox state based on ANY selected pods
  const anyPodsChecked = Array.from(event.target.closest('.pod-list')
      .querySelectorAll('.pod-checkbox'))
      .some(cb => cb.checked);

  serverCheckbox.checked = anyPodsChecked;

  // Update server selection based on pod selections
  if (anyPodsChecked) {
    selectedResources.servers.add(server);
  } else {
    selectedResources.servers.delete(server);
  }
}

document.getElementById('confirmSearch').addEventListener('click', () => {
  document.getElementById('selectionModal').style.display = 'none';
  search(true);
});

// Load selections on page load
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('searchSelections');
  if(saved) selectedResources = JSON.parse(saved);
});


document.getElementById('refineSearch').addEventListener('click', () => {
  if(window.serverPodData) {
    showServerSelection(window.serverPodData);
  }
});




// function displayResults(result) {
//   const resultsContainer = document.querySelector('.results');
//   resultsContainer.style.display = 'block';
//
//   resultsData = result;
//   currentPage = 1;
//   updatePagination();
//   createStatisticsLink(); // Recreate the Statistics link after each search
//   document.getElementById('refineSearch').style.display = 'inline-flex';
// }

// Update the updateSearchStats function
function updateSearchStats() {
  const statsElement = document.getElementById('searchStats');
  if (!statsElement) return;

  const uniqueServers = new Set();
  const uniquePods = new Set();

  resultsData.forEach(item => {
    try {
      const url = new URL(item.Id);
      uniqueServers.add(url.hostname);
      const podMatch = url.pathname.match(/vldb_pod[\d-]+/);
      if(podMatch) uniquePods.add(podMatch[0]);
    } catch(e) {
      console.error("Invalid URL:", item.Id);
    }
  });

  // Safely update elements
  const updateIfExists = (id, value) => {
    const el = document.getElementById(id);
    if(el) el.textContent = value;
  };

  updateIfExists('statDocuments', resultsData.length);
  updateIfExists('statServers', uniqueServers.size);
  updateIfExists('statPods', uniquePods.size);
  updateIfExists('statTime', (totalSearchTime/1000).toFixed(2));
}

function displayResults(result) {

  const existingPopup = document.getElementById("statisticsPopup");
  if (existingPopup) existingPopup.remove();

  const resultsContainer = document.querySelector('.results');
  const statsLine = document.getElementById('searchStats');

  resultsContainer.style.display = 'block';
  statsLine.style.display = 'flex';

  // Animate stats line after short delay
  setTimeout(() => {
    statsLine.classList.add('reveal');
  }, 100);

  resultsData = result;
  currentPage = 1;
  updatePagination();
  createStatisticsLink();
  document.getElementById('refineSearch').style.display = 'inline-flex';
  // updateResultsDisplay(); // Add this line

  updateSearchStats();
}

// Add hide function when needed
function hideResults() {
  document.querySelector('.results').style.display = 'none';
  document.getElementById('searchStats').style.display = 'none';
  document.getElementById('searchStats').classList.remove('reveal');
}

// Add this new helper function
function updateResultsDisplay() {
  const resultsList = document.querySelector('.results ul');
  resultsList.innerHTML = '';

  const startIndex = (currentPage - 1) * resultsPerPage;
  const paginatedResults = resultsData.slice(startIndex, startIndex + resultsPerPage);

  // Add results to the list
  paginatedResults.forEach(item => {
    const listItem = document.createElement('li');
    listItem.classList.add('result-item');

    const resultCard = document.createElement('div');
    resultCard.classList.add('result-card');

    // Create document icon
    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-file-alt');

    // Create ID header with link
    const idHeader = document.createElement('h3');
    idHeader.classList.add('result-id');
    const idLink = document.createElement('a');
    idLink.href = `${item.Id}`;
    idLink.textContent = `${item.Id}`;

    // Create score displays
    const scoreSpan = document.createElement('span');
    scoreSpan.classList.add('result-score');
    scoreSpan.textContent = `BM25 Score: ${item.BM25ScoreLocal?.toFixed(4) || 0}`;

    const scoreSpan2 = document.createElement('span');
    scoreSpan2.classList.add('result-score');
    scoreSpan2.textContent = `LM Score: ${item.LanguageModelingScoreLocal?.toFixed(4) || 0}`;

    const vectorScoreSpan1 = document.createElement('span');
    vectorScoreSpan1.classList.add('result-score');
    vectorScoreSpan1.textContent = `TF-IDF Cosine: ${(item.cosineTFIDFSimilarity?.toFixed(4) || 0)}`;

    const vectorScoreSpan2 = document.createElement('span');
    vectorScoreSpan2.classList.add('result-score');
    vectorScoreSpan2.textContent = `TF-IDF Euclidean: ${(item.invertedEuclideanTFIDF?.toFixed(4) || 0)}`;

    // Assemble elements
    idHeader.appendChild(icon);
    idHeader.appendChild(idLink);

    resultCard.appendChild(idHeader);
    resultCard.appendChild(scoreSpan);
    resultCard.appendChild(document.createTextNode(' '));
    resultCard.appendChild(scoreSpan2);
    resultCard.appendChild(document.createTextNode(' '));
    resultCard.appendChild(vectorScoreSpan1);
    resultCard.appendChild(document.createTextNode(' '));
    resultCard.appendChild(vectorScoreSpan2);

    listItem.appendChild(resultCard);
    resultsList.appendChild(listItem);
  });

  // Update statistics when results change
  updateStatistics();
}


// function updatePagination() {
//   // Clear existing pagination controls
//   const paginationContainer = document.getElementById("pagination");
//   paginationContainer.innerHTML = '';
//
//
//   // Remove existing popup if it exists
//   const existingPopup = document.getElementById("statisticsPopup");
//   if (existingPopup) existingPopup.remove();
//
//   const resultsContainer = document.querySelector('.results');
//   const resultsList = resultsContainer.querySelector('ul');
//   resultsList.innerHTML = '';
//
//   const startIndex = (currentPage - 1) * resultsPerPage;
//   const paginatedResults = resultsData.slice(startIndex, startIndex + resultsPerPage);
//
//   paginatedResults.forEach(item => {
//     const listItem = document.createElement('li');
//     listItem.classList.add('result-item');
//
//     const resultCard = document.createElement('div');
//     resultCard.classList.add('result-card');
//
//     // Create the document icon
//     const icon = document.createElement('i');
//     icon.classList.add('fas', 'fa-file-alt'); // FontAwesome document icon
//
//     // Create the ID link
//     const idHeader = document.createElement('h3');
//     idHeader.classList.add('result-id');
//     const idLink = document.createElement('a');
//     idLink.href = `${item.Id}`;
//     idLink.textContent = `${item.Id}`;
//
//     // Append icon and link to the header
//     idHeader.appendChild(icon);
//     idHeader.appendChild(idLink);
//
//     // Create a span for the score
//     const scoreSpan = document.createElement('span');
//     scoreSpan.classList.add('result-score');
//     // scoreSpan.textContent = `BM25 Score: ${item.Score}`;
//
//     scoreSpan.textContent = `BM25 Score: ${item.BM25ScoreLocal.toFixed(3)}`;
//
//     const scoreSpan2 = document.createElement('span');
//     scoreSpan2.classList.add('result-score');
//     scoreSpan2.textContent = `LM Score: ${item.LanguageModelingScoreLocal.toFixed(3)}`;
//
//
//     // Add new score displays
//     const vectorScoreSpan1 = document.createElement('span');
//     vectorScoreSpan1.classList.add('result-score');
//     vectorScoreSpan1.textContent = `TF-IDF Cosine: ${item.cosineTFIDFSimilarity.toFixed(3) || 0}`;
//
//     const vectorScoreSpan2 = document.createElement('span');
//     vectorScoreSpan2.classList.add('result-score');
//     vectorScoreSpan2.textContent = `TF-IDF Euclidean: ${item.invertedEuclideanTFIDF.toFixed(3) || 0}`;
//
//     // Add a space between the score spans by inserting a non-breaking space between them
//     const space = document.createElement('span');
//     space.textContent = " "; // Adds a regular space
//
//     resultCard.appendChild(idHeader);
//     resultCard.appendChild(scoreSpan);
//     resultCard.appendChild(space); // Add space
//     resultCard.appendChild(scoreSpan2);
//     resultCard.appendChild(space); // Add space
//     resultCard.appendChild(vectorScoreSpan1);
//     resultCard.appendChild(space); // Add space
//     resultCard.appendChild(vectorScoreSpan2);
//     listItem.appendChild(resultCard);
//     resultsList.appendChild(listItem);
//   });
//
//   resultsContainer.style.display = 'block';
//   createPaginationControls();
//
//   // FORCE REDRAW OF COMPONENTS
//   createStatisticsLink();
//   requestAnimationFrame(() => updateStatistics());
// }


function updatePagination() {

  const existingPopup = document.getElementById("statisticsPopup");
  if (existingPopup) existingPopup.remove();


  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = '';
  const totalPages = Math.ceil(resultsData.length / resultsPerPage);
  const maxVisiblePages = 5; // Show 5 numbered links at a time

  // Previous Button
  const prevButton = document.createElement('button');
  prevButton.textContent = 'Previous';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener('click', () => {
    currentPage--;
    updatePagination();
  });

  // Next Button
  const nextButton = document.createElement('button');
  nextButton.textContent = 'Next';
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener('click', () => {
    currentPage++;
    updatePagination();
  });

  // Page Number Logic
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Adjust if we're at the end
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  paginationContainer.appendChild(prevButton);

  // First page and ellipsis
  if (startPage > 1) {
    const firstPage = createPageButton(1);
    paginationContainer.appendChild(firstPage);
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      paginationContainer.appendChild(ellipsis);
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = createPageButton(i);
    paginationContainer.appendChild(pageButton);
  }

  // Last page and ellipsis
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      paginationContainer.appendChild(ellipsis);
    }
    const lastPage = createPageButton(totalPages);
    paginationContainer.appendChild(lastPage);
  }

  paginationContainer.appendChild(nextButton);

  // Add results summary
  const summaryContainer = document.createElement('div');
  summaryContainer.innerHTML = `Showing page ${currentPage} of ${totalPages}`;
  paginationContainer.appendChild(summaryContainer);

  createStatisticsLink();
  updateResultsDisplay();
}

function createPageButton(pageNumber) {
  const pageButton = document.createElement('button');
  pageButton.textContent = pageNumber;
  pageButton.disabled = pageNumber === currentPage;
  pageButton.classList.toggle('active', pageNumber === currentPage);
  pageButton.addEventListener('click', () => {
    currentPage = pageNumber;
    updatePagination();
  });
  return pageButton;
}


function createPaginationControls() {
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = '';

  const prevButton = document.createElement('button');
  prevButton.textContent = 'Previous';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      updatePagination();
    }
  });

  const nextButton = document.createElement('button');
  nextButton.textContent = 'Next';
  nextButton.disabled = currentPage * resultsPerPage >= resultsData.length;
  nextButton.addEventListener('click', () => {
    if (currentPage * resultsPerPage < resultsData.length) {
      currentPage++;
      updatePagination();
    }
  });


  paginationContainer.appendChild(prevButton);
  paginationContainer.appendChild(nextButton);

  // Add results summary below the pagination buttons
  const summaryContainer = document.createElement('div');
  summaryContainer.id = "resultsSummary";
  summaryContainer.classList.add('summary-box');
  paginationContainer.appendChild(summaryContainer);

  createStatisticsLink();
}

// Function to show/hide the statistics popup near the link
// function toggleStatisticsPopup(event) {
//   let popup = document.getElementById("statisticsPopup");
//
//   // Create popup if it doesn't exist
//   if (!popup) {
//     popup = document.createElement("div");
//     popup.id = "statisticsPopup";
//     popup.classList.add("stats-popup");
//     document.body.appendChild(popup);
//   }
//
//
//   // Add validation for data freshness
//   if (!resultsData || resultsData.length === 0) {
//     popup.innerHTML = `<p>No results to display</p>`;
//     return;
//   }
//
//   // Calculate unique statistics
//   const uniqueServers = new Set();
//   const uniquePods = new Set();
//
//   resultsData.forEach((item) => {
//     try {
//       const url = new URL(item.Id);
//       uniqueServers.add(url.host);
//       const podMatch = url.pathname.match(/(vldb_pod[\d-]+)/);
//       if (podMatch) uniquePods.add(podMatch[1]);
//     } catch (e) {
//       console.error("Invalid URL in results:", item.Id);
//     }
//   });
//
//   popup.innerHTML = `
//     <p><i class="fas fa-file"></i> <strong>Documents:</strong> ${resultsData.length}</p>
//     <p><i class="fas fa-server"></i> <strong>Servers:</strong> ${uniqueServers.size}</p>
//     <p><i class="fas fa-cube"></i> <strong>Pods:</strong> ${uniquePods.size}</p>
//     <p><i class="fas fa-clock"></i> <strong>Time:</strong> ${(totalSearchTime / 1000).toFixed(2)} seconds</p>
//   `;
//
//   // Position the popup near the "Statistics" link
//   const rect = event.target.getBoundingClientRect();
//   popup.style.left = `${rect.left + window.scrollX}px`;
//   popup.style.top = `${rect.top + window.scrollY - popup.offsetHeight - 10}px`;
//
//   // Toggle visibility
//   popup.classList.toggle("visible");
//
//   // Hide when clicking anywhere else
//   document.addEventListener("click", (e) => {
//     if (e.target !== event.target && popup.classList.contains("visible")) {
//       popup.classList.remove("visible");
//     }
//   });
// }

function toggleStatisticsPopup(event) {
  event.preventDefault();
  event.stopPropagation();

  // Remove existing popup if present
  const existingPopup = document.getElementById("statisticsPopup");
  const statsLink = event.currentTarget;

  // // Toggle popup visibility
  // if (existingPopup) {
  //   existingPopup.remove();
  //   return;
  // }

  if (existingPopup) existingPopup.remove();

  // Create new popup
  const popup = document.createElement("div");
  popup.id = "statisticsPopup";
  popup.classList.add("stats-popup");

  // Calculate fresh statistics
  const uniqueServers = new Set();
  const uniquePods = new Set();
  let totalScore = 0;

  resultsData.forEach((item) => {
    try {
      const url = new URL(item.Id);
      uniqueServers.add(url.host);
      const podMatch = url.pathname.match(/(vldb_pod[\d-]+)/);
      if (podMatch) uniquePods.add(podMatch[1]);
      totalScore += item.rankingScore || 0;
    } catch (e) {
      console.error("Invalid URL in results:", item.Id);
    }
  });

  // Populate popup content
  popup.innerHTML = `
    <p><i class="fas fa-file"></i> <strong>Documents:</strong> ${resultsData.length}</p>
    <p><i class="fas fa-server"></i> <strong>Servers:</strong> ${uniqueServers.size}</p>
    <p><i class="fas fa-cube"></i> <strong>Pods:</strong> ${uniquePods.size}</p>
    <p><i class="fas fa-clock"></i> <strong>Time:</strong> ${(totalSearchTime/1000).toFixed(2)}s</p>
  `;


  // Add click handler to the document
  document.addEventListener("click", function clickHandler(e) {
    if (!popup.contains(e.target) && e.target !== statsLink) {
      popup.remove();
      document.removeEventListener("click", clickHandler);
    }
  }, { capture: true });

  // Add handler for Escape key
  document.addEventListener("keydown", function keyHandler(e) {
    if (e.key === "Escape") {
      popup.remove();
      document.removeEventListener("keydown", keyHandler);
    }
  });

  // Position and show popup
  const rect = event.target.getBoundingClientRect();
  popup.style.left = `${rect.left + window.scrollX}px`;
  popup.style.top = `${rect.top + window.scrollY - popup.offsetHeight - 10}px`;
  document.body.appendChild(popup);
  popup.classList.add("visible");

  // Add click-away listener
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".stats-popup") && e.target !== event.target) {
      popup.remove();
    }
  }, { once: true });




}



// Function to create the Statistics link
// function createStatisticsLink() {
//   let statsLink = document.getElementById("statsLink");
//   if (!statsLink) {
//     statsLink = document.createElement("a");
//     statsLink.id = "statsLink";
//     statsLink.href = "#";
//     statsLink.textContent = "Statistics";
//     statsLink.style.cursor = "pointer";
//     statsLink.style.position = "relative"; // Helps with positioning
//     statsLink.style.fontWeight = "bold";
//
//     // Event listener for click
//     statsLink.addEventListener("click", (event) => {
//       event.preventDefault();
//       toggleStatisticsPopup(event);
//     });
//
//     document.getElementById("pagination").appendChild(statsLink);
//   }
// }


// function createStatisticsLink() {
//   // Remove existing statsLink if present
//   const existingLink = document.getElementById("statsLink");
//   if (existingLink) {
//     existingLink.remove();
//   }
//
//   // Create new link
//   const statsLink = document.createElement("a");
//   statsLink.id = "statsLink";
//   statsLink.href = "#";
//   statsLink.textContent = "Statistics";
//   statsLink.style.cssText = "cursor: pointer; position: relative; font-weight: bold; margin-left: 10px;";
//
//   // Add fresh event listener
//   statsLink.addEventListener("click", (event) => {
//     event.preventDefault();
//     toggleStatisticsPopup(event);
//   });
//
//   // Append to pagination container
//   document.getElementById("pagination").appendChild(statsLink);
// }


function createStatisticsLink() {
  // Remove existing link if present
  const existingLink = document.getElementById("statsLink");
  if (existingLink) existingLink.remove();

  // Create new link element
  const statsLink = document.createElement("a");
  statsLink.id = "statsLink";
  statsLink.href = "#";
  statsLink.textContent = "Statistics";
  statsLink.style.cssText = "cursor: pointer; margin-left: 15px; color: #007bff;";

  // Add fresh click handler
  statsLink.addEventListener("click", (event) => {
    event.preventDefault();
    toggleStatisticsPopup(event);
  });

  // Add to pagination container
  const paginationContainer = document.getElementById("pagination");
  if (paginationContainer) {
    paginationContainer.appendChild(statsLink);
  }
}

function updateStatistics() {
  let uniqueServers = new Set();
  let uniquePods = new Set();

  resultsData.forEach((item) => {
    try {
      const url = new URL(item.Id);
      uniqueServers.add(url.host);
      const podMatch = url.pathname.match(/(vldb_pod[\d-]+)/);
      if (podMatch) uniquePods.add(podMatch[1]);
    } catch (e) {
      console.error("Invalid URL in results:", item.Id);
    }
  });

  let statsPopup = document.getElementById("statisticsPopup");

  if (!statsPopup) {
    statsPopup = document.createElement("div");
    statsPopup.id = "statisticsPopup";
    statsPopup.classList.add("stats-popup");
    document.body.appendChild(statsPopup);
  }

  statsPopup.innerHTML = `
      <p><i class="fas fa-file"></i> <strong>Documents:</strong> ${resultsData.length}</p>
      <p><i class="fas fa-server"></i> <strong>Servers:</strong> ${uniqueServers.size}</p>
      <p><i class="fas fa-cube"></i> <strong>Pods:</strong> ${uniquePods.size}</p>
  `;
}




