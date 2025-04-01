// components/Modal.js
export class Modal {
	constructor() {
		this.focusElementId = null; // Store the ID of the element to focus after closing the modal

		// Create modal overlay
		this.modalOverlay = document.createElement('div');
		this.modalOverlay.id = 'modalOverlay';
		this.modalOverlay.tabIndex = -1; // Allow the overlay to be focused
		this.modalOverlay.className =
			'fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center';

		// Create modal content
		this.modalContent = document.createElement('div');
		this.modalContent.className = 'bg-white p-6 rounded-lg shadow-lg w-96 text-center';

		// Modal header (icon + title)
		const modalHeader = document.createElement('div');
		modalHeader.className = 'flex items-center justify-center mb-4'; // Flexbox for horizontal alignment

		// Modal icon
		this.modalIcon = document.createElement('div');
		this.modalIcon.className = 'mr-2';

		// Modal title
		this.modalTitle = document.createElement('h2');
		this.modalTitle.id = 'modalTitle';
		this.modalTitle.className = 'text-xl font-bold px-3';
		this.modalTitle.textContent = 'Default Title';

		// Append icon and title to the header
		modalHeader.appendChild(this.modalIcon);
		modalHeader.appendChild(this.modalTitle);

		// Modal message
		this.modalMessage = document.createElement('p');
		this.modalMessage.id = 'modalMessage';
		this.modalMessage.className = 'text-gray-700 mb-4';
		this.modalMessage.textContent = 'This is the default message.';

		// Form container (initially hidden)
		this.formContainer = document.createElement('div');
		this.formContainer.className = 'hidden mb-4';

		// Artist input
		this.artistInput = document.createElement('input');
		this.artistInput.type = 'text';
		this.artistInput.placeholder = 'Artist';
		this.artistInput.className =
			'w-full p-2 mb-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';

		// Title input
		this.titleInput = document.createElement('input');
		this.titleInput.type = 'text';
		this.titleInput.placeholder = 'Title';
		this.titleInput.className =
			'w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';

		// Append inputs to form container
		this.formContainer.appendChild(this.artistInput);
		this.formContainer.appendChild(this.titleInput);

		// Close button container (to center-align the button)
		const buttonContainer = document.createElement('div');
		buttonContainer.className = 'flex justify-center gap-2'; // Added gap-2 for spacing between buttons

		// Close button
		this.closeButton = document.createElement('button');
		this.closeButton.id = 'closeModal';
		this.closeButton.className = 'text-black px-4 py-2 rounded'; // Base button styles
		this.closeButton.textContent = 'Close';

		// Yes button (initially hidden)
		this.yesButton = document.createElement('button');
		this.yesButton.id = 'yesModal';
		this.yesButton.className = 'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600';
		this.yesButton.textContent = 'Yes';

		// No button (initially hidden)
		this.noButton = document.createElement('button');
		this.noButton.id = 'noModal';
		this.noButton.className = 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600';
		this.noButton.textContent = 'No';

		// Save button (initially hidden)
		this.saveButton = document.createElement('button');
		this.saveButton.id = 'saveModal';
		this.saveButton.className = 'bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600';
		this.saveButton.textContent = 'Save';

		// Cancel button (initially hidden)
		this.cancelButton = document.createElement('button');
		this.cancelButton.id = 'cancelModal';
		this.cancelButton.className = 'bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600';
		this.cancelButton.textContent = 'Cancel';

		// Append the buttons to the container
		buttonContainer.appendChild(this.yesButton);
		buttonContainer.appendChild(this.noButton);
		buttonContainer.appendChild(this.saveButton);
		buttonContainer.appendChild(this.cancelButton);
		buttonContainer.appendChild(this.closeButton);

		// Append elements to modal content
		this.modalContent.appendChild(modalHeader); // Add the header (icon + title)
		this.modalContent.appendChild(this.modalMessage);
		this.modalContent.appendChild(this.formContainer); // Add the form container
		this.modalContent.appendChild(buttonContainer); // Append the button container

		// Append modal content to overlay
		this.modalOverlay.appendChild(this.modalContent);

		// Append modal overlay to body
		document.body.appendChild(this.modalOverlay);

		this.close = this.close.bind(this); // Bind 'this'
		this.closeButton.addEventListener('click', this.close); // Use bound close

		this.keydownHandler = (event) => {
			// Store the handler
			if (event.key === 'Escape' || event.key === 'Enter') {
				event.preventDefault(); // Prevent form submission if Enter is pressed.
				this.close();
			}
		};

		this.overlayClickHandler = (event) => {
			// Store the handler
			if (event.target === this.modalOverlay) {
				this.close();
			}
		};
	}

	// Method to open the modal
	open(
		title,
		message,
		buttonType = 'default',
		inputID,
		onYes = null,
		onNo = null,
		onSave = null,
		query = null
	) {
		this.modalTitle.textContent = title;
		this.modalMessage.textContent = message;
		this.focusElementId = inputID;

		// Reset button visibility
		this.yesButton.classList.add('hidden');
		this.noButton.classList.add('hidden');
		this.saveButton.classList.add('hidden');
		this.cancelButton.classList.add('hidden');
		this.closeButton.classList.remove('hidden');
		this.formContainer.classList.add('hidden');

		// Set button color and icon based on buttonType
		if (buttonType === 'error') {
			// Red button for errors
			this.closeButton.className = 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600';
			// Error icon (Heroicons: exclamation-circle)
			this.modalIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-red-500 w-6 h-6 px-2">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
		} else if (buttonType === 'success') {
			// Blue button for success
			this.closeButton.className = 'bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600';
			// Success icon (Heroicons: check-circle)
			this.modalIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-green-500 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      `;
		} else if (buttonType === 'warning') {
			// Yellow button for warnings
			this.closeButton.className =
				'bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-200';
			// Warning icon (Heroicons: exclamation-triangle)
			this.modalIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-yellow-500 w-6 h-6 px-2">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      `;
		} else if (buttonType === 'yesno') {
			// Hide close button and show Yes/No buttons
			this.closeButton.classList.add('hidden');
			this.yesButton.classList.remove('hidden');
			this.noButton.classList.remove('hidden');

			// Set button colors for Yes/No buttons
			this.yesButton.className =
				'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-24';
			this.noButton.className = 'bg-red-400 text-white px-4 py-2 rounded hover:bg-red-600 w-24';

			// Set up Yes/No button handlers
			this.yesButton.onclick = () => {
				if (onYes) onYes();
				// Don't close the modal here, let the form modal handle it
			};
			this.noButton.onclick = () => {
				if (onNo) onNo();
				this.close();
			};
		} else if (buttonType === 'form') {
			// Show form and Save/Cancel buttons
			this.closeButton.classList.add('hidden');
			this.saveButton.classList.remove('hidden');
			this.cancelButton.classList.remove('hidden');
			this.formContainer.classList.remove('hidden');

			// Set title input value if query was provided
			if (query) {
				this.titleInput.value = query;
			}

			// Set up Save/Cancel button handlers
			this.saveButton.onclick = () => {
				if (onSave) {
					onSave({
						artist: this.artistInput.value,
						title: this.titleInput.value,
					});
				}
				this.close();
			};
			this.cancelButton.onclick = () => {
				this.close();
			};

			// Focus the first input
			this.artistInput.focus();

			// Add form icon
			this.modalIcon.innerHTML = `
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-blue-500 w-6 h-6 px-2">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
			`;
		} else {
			// Default button color (gray)
			this.closeButton.className = 'bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600';
			// Default icon (Heroicons: information-circle)
			this.modalIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-gray-500 w-6 h-6 px-2">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
		}

		// Show the modal
		this.modalOverlay.classList.remove('hidden');
		this.modalOverlay.classList.add('flex');

		// Add event listeners AFTER the modal is shown (using setTimeout 0)
		setTimeout(() => {
			document.addEventListener('keydown', this.keydownHandler);
			this.modalOverlay.addEventListener('click', this.overlayClickHandler);

			this.modalOverlay.focus();
		}, 0);
	}

	// Method to close the modal
	close(focusElementId) {
		document.removeEventListener('keydown', this.keydownHandler);
		this.modalOverlay.removeEventListener('click', this.overlayClickHandler);

		// Hide the modal
		this.modalOverlay.classList.remove('flex');
		this.modalOverlay.classList.add('hidden');

		// Clear input fields
		if (this.artistInput) {
			this.artistInput.value = '';
		}
		if (this.titleInput) {
			this.titleInput.value = '';
		}

		// Focus the element if provided and it exists
		if (this.focusElementId && typeof this.focusElementId.focus === 'function') {
			this.focusElementId.focus();
		}
	}
}
