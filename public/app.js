import Trie from './Trie.js';

// Global Trie instance
let trie = new Trie();

// Fetch artist - title names from the server and initialize the Trie
window.initializeTrie = async (forceInit = false) => {
	console.log('Initializing Trie...');
	return new Promise(async (resolve, reject) => {
		if (forceInit) {
			//need to refresh data for the Trie
			console.log('Forcing Trie initialization...');
			localStorage.removeItem('trieData');
		}

		// Check if Trie data is already stored in localStorage
		const storedTrieData = localStorage.getItem('trieData');

		if (storedTrieData) {
			// Reconstruct the Trie from the stored data
			trie = Trie.deserialize(JSON.parse(storedTrieData));
			console.log('Trie initialized from localStorage');
			console.log(`Total words in Trie: ${trie.getWordCount()}`);
			window.trie = trie;
			resolve(); // Resolve the Promise immediately
		} else {
			// Fetch artist names from the server
			console.log('Fetching artist names from server...');
			// await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate a 2-second delay
			fetch('/api/uniquesongs')
				.then((response) => response.json())
				.then((data) => {
					// console.log("Fetched songs from db:  ",data);
					// Initialize the Trie
					trie = new Trie();

					// Validate and insert each artist name
					if (Array.isArray(data.songs)) {
						// Log the data for debugging
						console.log('Fetched songs from db:  ', data.songs.length);
						console.log('Inserting artist - title names into Trie...');
						data.songs.forEach((song) => {
							trie.insert(song.song);
						});
					} else {
						console.error('Expected artistNames to be an array, but got:', data.songs);
						throw new Error('Invalid data format: artistNames is not an array');
					}
					console.log(`Total words in Trie: ${trie.getWordCount()}`);

					// Serialize the Trie and store it in localStorage
					localStorage.setItem('trieData', JSON.stringify(trie.serialize()));

					console.log('Trie initialized with artist names from server');
					window.trie = trie;
					resolve(); // Resolve the Promise after initialization
				})
				.catch((error) => {
					console.error('Error fetching songs:', error);
					reject(error); // Reject the Promise if there's an error
				});
		}
	});
};

// Handle search button click
function setupSearch() {
	document.getElementById('search-button').addEventListener('click', () => {
		const query = document.getElementById('search-input').value.trim();

		if (!query) {
			alert('Please enter a search term');
			return;
		}

		// Perform the search using the global Trie instance
		const results = trie.combinedSearch(query);

		// Display the results
		const resultsList = document.getElementById('results');
		resultsList.innerHTML = ''; // Clear previous results

		if (results.length === 0) {
			resultsList.innerHTML = '<li>No results found</li>';
		} else {
			results.forEach((result) => {
				const li = document.createElement('li');
				li.textContent = result;
				resultsList.appendChild(li);
			});
		}
	});
}

// // Initialize the Trie and set up search functionality
initializeTrie()
	.then(() => {
		// setupSearch();
	})
	.catch((error) => {
		console.error('Failed to initialize Trie:', error);
	});

window.trie = trie;
