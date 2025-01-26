// Global Trie instance
let trie;

// Fetch artist names from the server and initialize the Trie
function initializeTrie() {
    console.log("Initializing Trie...");
    return new Promise((resolve, reject) => {
        // Check if Trie data is already stored in localStorage
        const storedTrieData = localStorage.getItem("trieData");

        if (storedTrieData) {
            // Reconstruct the Trie from the stored data
            trie = Trie.deserialize(JSON.parse(storedTrieData));
            console.log("Trie initialized from localStorage");            
            console.log(`Total words in Trie: ${trie.getWordCount()}`);
            resolve(); // Resolve the Promise immediately
        } else {
            // Fetch artist names from the server
            console.log("Fetching artist names from server...");
            fetch("/artist-names")
                .then((response) => response.json())
                .then((data) => {
                    // Log the data for debugging
                    console.log("Fetched artist names:", data);

                    // Initialize the Trie
                    trie = new Trie();

                    // Validate and insert each artist name
                    if (Array.isArray(data.artistNames)) {
                        console.log("Inserting artist names into Trie...");
                        data.artistNames.forEach((name) => {
                            if (typeof name.Artist === "string" && name.Artist.trim() !== "") {
                                trie.insert(name.Artist);
                            } else {
                                console.warn("Invalid artist name:", name);
                            }
                        });
                    } else {
                        console.error("Expected artistNames to be an array, but got:", data.artistNames);
                        throw new Error("Invalid data format: artistNames is not an array");
                    }

                    // Serialize the Trie and store it in localStorage
                    localStorage.setItem("trieData", JSON.stringify(trie.serialize()));

                    console.log("Trie initialized with artist names from server");
                    resolve(); // Resolve the Promise after initialization
                })
                .catch((error) => {
                    console.error("Error fetching artist names:", error);
                    reject(error); // Reject the Promise if there's an error
                });
        }
    });
}

// Handle search button click
function setupSearch() {
    document.getElementById("search-button").addEventListener("click", () => {
        const query = document.getElementById("search-input").value.trim();

        if (!query) {
            alert("Please enter a search term");
            return;
        }

        // Perform the search using the global Trie instance
        const results = trie.combinedSearch(query);

        // Display the results
        const resultsList = document.getElementById("results");
        resultsList.innerHTML = ""; // Clear previous results

        if (results.length === 0) {
            resultsList.innerHTML = "<li>No results found</li>";
        } else {
            results.forEach((result) => {
                const li = document.createElement("li");
                li.textContent = result;
                resultsList.appendChild(li);
            });
        }
    });
}

// Initialize the Trie and set up search functionality
initializeTrie()
    .then(() => {
        // setupSearch();
    })
    .catch((error) => {
        console.error("Failed to initialize Trie:", error);
    });