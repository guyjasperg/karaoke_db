function toTitleCase(str) {
	const keywords = ['and', 'of', 'the', 'a', 'to', 'in', 'is', 'it', 'for', 'ni', 'at', 'na'];

	try {
		const words = str.toLowerCase().split(/\s+/);
		const titleCaseWords = words.map((word, index) => {
			if (keywords.includes(word) && index !== 0 && !(index > 0 && words[index - 1] === '-')) {
				// If the word is a keyword, NOT the first word, and NOT preceded by a hyphen
				return word;
			} else {
				return word.charAt(0).toUpperCase() + word.slice(1);
			}
		});

		const titleCaseStr = titleCaseWords.join(' ');

		// Log the result
		// console.log('Title Case:', titleCaseStr);

		return titleCaseStr;
	} catch (error) {
		console.log('toTitleCase: ERROR ', error);
		return str;
	}
}

module.exports.toTitleCase = toTitleCase;
