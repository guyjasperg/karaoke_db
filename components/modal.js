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
    this.modalContent.className =
      'bg-white p-6 rounded-lg shadow-lg w-96 text-center';

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

    // Close button container (to center-align the button)
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex justify-center'; // Center-align the button

    // Close button
    this.closeButton = document.createElement('button');
    this.closeButton.id = 'closeModal';
    this.closeButton.className =
      'text-white px-4 py-2 rounded'; // Base button styles
    this.closeButton.textContent = 'Close';

    // Append the close button to the container
    buttonContainer.appendChild(this.closeButton);

    // Append elements to modal content
    this.modalContent.appendChild(modalHeader); // Add the header (icon + title)
    this.modalContent.appendChild(this.modalMessage);
    this.modalContent.appendChild(buttonContainer); // Append the button container

    // Append modal content to overlay
    this.modalOverlay.appendChild(this.modalContent);

    // Append modal overlay to body
    document.body.appendChild(this.modalOverlay);

    this.close = this.close.bind(this); // Bind 'this'
    this.closeButton.addEventListener('click', this.close); // Use bound close
    
    this.keydownHandler = (event) => { // Store the handler
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission if Enter is pressed.
        this.close();
      }
    };

    this.overlayClickHandler = (event) => { // Store the handler
      if (event.target === this.modalOverlay) {
        this.close();
      }
    }

  }

  // Method to open the modal
  open(title, message, buttonType = 'default', inputID) {
    this.modalTitle.textContent = title;
    this.modalMessage.textContent = message;
    this.focusElementId = inputID;

    // Set button color and icon based on buttonType
    if (buttonType === 'error') {
      // Red button for errors
      this.closeButton.className =
        'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600';
      // Error icon (Heroicons: exclamation-circle)
      this.modalIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-red-500 w-6 h-6 px-2">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
    } else if (buttonType === 'success') {
      // Blue button for success
      this.closeButton.className =
        'bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600';
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
    } else {
      // Default button color (gray)
      this.closeButton.className =
        'bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600';
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

    this.modalOverlay.classList.remove('flex');
    this.modalOverlay.classList.add('hidden');

    // Add this line to blur the input:
    if(this.focusElementId!==null){
      this.focusElementId.focus();
    }
  }
}