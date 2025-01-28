class TrieNode {
    constructor() {
        this.children = {}; // Stores the child nodes (characters)
        this.isEndOfWord = false; // Marks the end of a word
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode(); // Root node of the Trie
    }

    // Insert a word into the Trie (preserve original case)
    insert(word) {
        let currentNode = this.root;
        for (let char of word) {
            if (!currentNode.children[char]) {
                currentNode.children[char] = new TrieNode(); // Create a new node if the character doesn't exist
            }
            currentNode = currentNode.children[char]; // Move to the next node
        }
        currentNode.isEndOfWord = true; // Mark the end of the word
    }

    // Search for a word in the Trie (case-insensitive)
    search(word) {
        return this._searchHelper(this.root, word, 0);
    }

    // Helper function for case-insensitive search
    _searchHelper(node, word, index) {
        if (index === word.length) {
            return node.isEndOfWord; // Return true only if it's the end of a word
        }
        const char = word[index].toLowerCase(); // Convert character to lowercase for case-insensitive search
        for (let childChar in node.children) {
            if (childChar.toLowerCase() === char) {
                if (this._searchHelper(node.children[childChar], word, index + 1)) {
                    return true; // Recursively search for the next character
                }
            }
        }
        return false; // Word not found
    }

    // Check if a prefix exists in the Trie (case-insensitive)
    startsWith(prefix) {
        return this._startsWithHelper(this.root, prefix, 0);
    }

    // Helper function for case-insensitive prefix search
    _startsWithHelper(node, prefix, index) {
        if (index === prefix.length) {
            return true; // Prefix exists
        }
        const char = prefix[index].toLowerCase(); // Convert character to lowercase for case-insensitive search
        for (let childChar in node.children) {
            if (childChar.toLowerCase() === char) {
                if (this._startsWithHelper(node.children[childChar], prefix, index + 1)) {
                    return true; // Recursively search for the next character
                }
            }
        }
        return false; // Prefix not found
    }

    // Get all words with a given prefix (case-insensitive, preserve original case)
    getWordsWithPrefix(prefix) {
        let results = [];
        this._traverseTrieForPrefix(this.root, "", prefix.toLowerCase(), results); // Convert prefix to lowercase
        return results;
    }

    // Helper function to traverse the Trie and find words that start with the prefix
    _traverseTrieForPrefix(node, currentWord, prefix, results) {
        if (node.isEndOfWord && currentWord.toLowerCase().startsWith(prefix)) {
            results.push(currentWord); // Add the word if it starts with the prefix (case-insensitive)
        }
        for (let char in node.children) {
            this._traverseTrieForPrefix(node.children[char], currentWord + char, prefix, results); // Recursively traverse the Trie
        }
    }

    // Find all words that contain a given substring (case-insensitive)
    getWordsWithSubstring(substring) {
        let results = [];
        this._traverseTrieForSubstring(this.root, "", substring.toLowerCase(), results); // Convert substring to lowercase
        return results;
    }

    // Helper function to traverse the Trie and find matches in the middle
    _traverseTrieForSubstring(node, currentWord, substring, results) {
        if (node.isEndOfWord && currentWord.toLowerCase().includes(substring)) {
            results.push(currentWord); // Add the word if it contains the substring (case-insensitive)
        }
        for (let char in node.children) {
            this._traverseTrieForSubstring(node.children[char], currentWord + char, substring, results); // Recursively traverse the Trie
        }
    }

    // Combined search: First search for prefix matches, then add substring matches (without duplicates)
    combinedSearch(query) {
        console.log("combinedSearch", query);

        // Step 1: Get prefix matches (case-insensitive, preserve original case)
        const prefixMatches = this.getWordsWithPrefix(query);

        // Step 2: Get substring matches (case-insensitive)
        const substringMatches = this.getWordsWithSubstring(query);

        // Step 3: Combine results and remove duplicates using a Set
        const combinedResultsSet = new Set([...prefixMatches, ...substringMatches]);

        // Step 4: Convert the Set back to an array and sort the results alphabetically
        // const combinedResults = Array.from(combinedResultsSet).sort((a, b) => a.localeCompare(b));

        // return combinedResults;
        return combinedResultsSet;
    }

    // Serialize the Trie (convert it to a JSON-compatible object)
    serialize() {
        return this._serializeNode(this.root);
    }

    // Helper function to serialize a Trie node
    _serializeNode(node) {
        const serializedNode = {
            isEndOfWord: node.isEndOfWord,
            children: {},
        };
        for (let char in node.children) {
            serializedNode.children[char] = this._serializeNode(node.children[char]);
        }
        return serializedNode;
    }

    // Deserialize the Trie (reconstruct it from a JSON-compatible object)
    static deserialize(data) {
        const trie = new Trie();
        trie.root = trie._deserializeNode(data);
        return trie;
    }

    // Helper function to deserialize a Trie node
    _deserializeNode(data) {
        const node = new TrieNode();
        node.isEndOfWord = data.isEndOfWord;
        for (let char in data.children) {
            node.children[char] = this._deserializeNode(data.children[char]);
        }
        return node;
    }

    // Get the total number of words in the Trie
    getWordCount() {
        return this._countWords(this.root);
    }

    // Helper function to count words in the Trie
    _countWords(node) {
        let count = 0;

        // If the current node marks the end of a word, increment the count
        if (node.isEndOfWord) {
            count++;
        }

        // Recursively count words in all child nodes
        for (let char in node.children) {
            count += this._countWords(node.children[char]);
        }

        return count;
    }
}

// Example usage with artist names
// const trie = new Trie();
// const artistNames = [
//     "Taylor Swift",
//     "The Weeknd",
//     "Adele",
//     "Ed Sheeran",
//     "Bruno Mars",
//     "Billie Eilish",
//     "Dua Lipa",
//     "Ariana Grande",
//     "Drake",
//     "Kanye West",
// ];

// // Insert all artist names into the Trie (preserve original case)
// artistNames.forEach((artist) => trie.insert(artist));

// // Combined search example (case-insensitive, no duplicates, preserve original case)
// console.log(trie.combinedSearch("a")); 
// // ["Adele", "Ariana Grande", "Bruno Mars", "Drake", "Kanye West", "Taylor Swift"]

// console.log(trie.combinedSearch("an")); 
// // ["Ariana Grande", "Bruno Mars", "Kanye West"]

// console.log(trie.combinedSearch("sw")); 

// console.log(trie.combinedSearch("ar")); 
// ["Taylor Swift"]

// Export the Trie class
export default Trie; 