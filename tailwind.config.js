module.exports = {
	content: ['./public/**/*.{html,js}', './components/**/*.js'],
	theme: {
		extend: {},
	},
	variants: {
		extend: {
			backgroundColor: ['odd', 'even'],
		},
	},
	plugins: [],
	safelist: ['gap-2'],
};
