// Main application JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        searchInput: document.getElementById('search-input'),
        searchButton: document.getElementById('search-button'),
        resultsSectionAccordion: document.getElementById('results-section-accordion'),
        hideResultsButton: document.getElementById('hide-results-button'),
        resultsCardContainer: document.getElementById('results-card-container'),
        searchAccordion: document.getElementById('search-accordion'),
        resultsHeading: document.getElementById('results-heading'),
        resultsTable: document.getElementById('results-table'),
        resultsTableBody: document.getElementById('results-table-body'),
        searchLoading: document.getElementById('search-loading'),
        statusLoading: document.getElementById('status-loading'),
        statusTable: document.getElementById('status-table'),
        statusTableBody: document.getElementById('status-table-body'),
        modalOverlay: document.getElementById('modal-overlay'),
        detailsContainer: document.getElementById('details-container'),
        statusCardContainer: document.getElementById('status-card-container'), // Add this line
        scrollButton: document.getElementById('scroll-toggle-button'),
        body: document.body,
        html: document.documentElement, // For cross-browser compatibility
        header: document.querySelector('header'), // For scrolling to the top
        darkModeToggle: document.getElementById('dark-mode-toggle'),
        sunIcon: document.getElementById('sun-icon'),
        moonIcon: document.getElementById('moon-icon'),
    };

    let isAtTop = true; // State to track scroll position

    // Scroll to the appropriate position
    elements.scrollButton.addEventListener('click', () => {
        if (isAtTop) {
            // Scroll to the bottom of the page
            window.scrollTo({
                top: elements.html.scrollHeight,
                behavior: 'smooth',
            });
        } else {
            // Scroll to the top of the page
            elements.header.scrollIntoView({ behavior: 'smooth' });
        }

        // Toggle state and update the button icon
        isAtTop = !isAtTop;
        updateScrollButtonIcon();
    });

    // Update button icon
    function updateScrollButtonIcon() {
        elements.scrollButton.innerHTML = isAtTop
            ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L9 15.586V4a1 1 0 112 0v11.586l2.293-2.293a1 1 0 111.414 1.414l-4 4A1 1 0 0110 18z" clip-rule="evenodd" />
                </svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 2a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L11 4.414V16a1 1 0 11-2 0V4.414l-2.293 2.293a1 1 0 11-1.414-1.414l4-4A1 1 0 0110 2z" clip-rule="evenodd" />
                </svg>`;
    }

    // Ensure button is visible on mobile only
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    if (mediaQuery.matches) {
        elements.scrollButton.classList.remove('hidden');
    };

    // State
    let currentBookDetails = null;
    const STATE = {
        isSearching: false,
        isLoadingDetails: false
    };

    // Constants
    const REFRESH_INTERVAL = 60000; // 60 seconds
    const API_ENDPOINTS = {
        search: '/api/search',
        info: '/api/info',
        download: '/api/download',
        status: '/api/status'
    };

    // Utility Functions
    const utils = {
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        showLoading(element) {
            element.removeAttribute('hidden');
        },

        hideLoading(element) {
            element.setAttribute('hidden', '');
        },

        showAccordion(element) {
            UIkit.accordion(element).toggle(1, true);
        },

        async fetchJson(url, options = {}) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Fetch error:', error);
                throw error;
            }
        },

        createElement(tag, attributes = {}, children = []) {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                element[key] = value;
            });
        
            // Ensure children is an array
            const childArray = Array.isArray(children) ? children : [children];
        
            childArray.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    element.appendChild(child);
                }
            });
        
            return element;
        }
    };

    // Search Functions
    const search = {
        async performSearch(query) {
            if (STATE.isSearching) return;
        
            try {
                STATE.isSearching = true;
                utils.showLoading(elements.searchLoading);
        
                // Ensure results section is displayed
                if (elements.resultsSectionAccordion) {
                    elements.resultsSectionAccordion.hidden = false;
                }
        
                // Fetch search results
                const data = await utils.fetchJson(
                    `${API_ENDPOINTS.search}?query=${encodeURIComponent(query)}`
                );
        
                // Display results
                if (elements.resultsTableBody) {
                    this.displayResults(data);
                } else {
                    console.error('Error: resultsTableBody element is missing in the DOM.');
                }
            } catch (error) {
                console.error('Search error:', error);
                this.handleSearchError(error);
            } finally {
                STATE.isSearching = false;
                utils.hideLoading(elements.searchLoading);
            }
        },
    
        displayResults(books) {
            // Clear table and card containers
            elements.resultsTableBody.innerHTML = '';
            const cardContainer = document.getElementById('results-card-container');
            cardContainer.innerHTML = '';
        
            if (!books.length) {
                this.displayNoResults();
                return;
            }
        
            books.forEach((book, index) => {
                // Add to table for larger screens
                const row = this.createBookRow(book, index);
                elements.resultsTableBody.appendChild(row);
        
                // Add to card container for mobile
                const card = this.createBookCard(book, index);
                cardContainer.appendChild(card);
            });
        },
        
        displayNoResults() {
            // Handle empty state for both table and cards
            elements.resultsTableBody.innerHTML = '';
            const cardContainer = document.getElementById('results-card-container');
            cardContainer.innerHTML = '';
        
            const tableRow = utils.createElement('tr', {}, [
                utils.createElement('td', {
                    colSpan: '10',
                    textContent: 'No results found.'
                }),
            ]);
            elements.resultsTableBody.appendChild(tableRow);
        
            const card = utils.createElement('div', {
                className: 'bg-white shadow rounded-md p-4 mb-4 text-center text-gray-600'
            }, 'No results found.');
            cardContainer.appendChild(card);
        },
        
        createBookRow(book, index) {
            // Table row for larger screens
            return utils.createElement('tr', {}, [
                utils.createElement('td', { textContent: index + 1 }),
                this.createPreviewCell(book.preview),
                utils.createElement('td', { textContent: book.title || 'N/A' }),
                utils.createElement('td', { textContent: book.author || 'N/A' }),
                utils.createElement('td', { textContent: book.publisher || 'N/A' }),
                utils.createElement('td', { textContent: book.year || 'N/A' }),
                this.createActionCell(book)
            ]);
        },
        
        createBookCard(book, index) {
            // Card for mobile-friendly display
            return utils.createElement('div', {
                className: 'bg-white shadow rounded-md p-4 mb-4'
            }, [
                utils.createElement('div', { className: 'flex items-start gap-4' }, [
                    book.preview
                        ? utils.createElement('img', {
                              src: book.preview,
                              alt: 'Book Preview',
                              className: 'w-16 h-24 object-cover rounded'
                          })
                        : utils.createElement('div', { className: 'w-16 h-24 bg-gray-200 rounded' }),
                    utils.createElement('div', {}, [
                        utils.createElement('h3', { className: 'font-bold text-lg' }, book.title || 'N/A'),
                        utils.createElement('p', { className: 'text-gray-600' }, `Author: ${book.author || 'N/A'}`),
                        utils.createElement('p', { className: 'text-gray-600' }, `Publisher: ${book.publisher || 'N/A'}`),
                        utils.createElement('p', { className: 'text-gray-600' }, `Year: ${book.year || 'N/A'}`)
                    ])
                ]),
                utils.createElement('div', { className: 'mt-4 flex gap-2' }, [
                    utils.createElement('button', {
                        className: 'bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700',
                        onclick: () => bookDetails.show(book.id)
                    }, 'Details'),
                    utils.createElement('button', {
                        className: 'bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700',
                        onclick: () => bookDetails.downloadBook(book)
                    }, 'Download')
                ])
            ]);
        },
        
        createPreviewCell(previewUrl) {
            if (!previewUrl) {
                return utils.createElement('td', { textContent: 'N/A' });
            }
        
            const img = utils.createElement('img', {
                src: previewUrl,
                alt: 'Book Preview',
                style: 'max-width: 60px;'
            });
        
            return utils.createElement('td', {}, [img]);
        },
        
        createActionCell(book) {
            const buttonDetails = utils.createElement('button', {
                className: 'bg-gray-600 text-white px-2 py-1 rounded-md shadow hover:bg-gray-700 focus:ring focus:ring-gray-300',
                onclick: () => bookDetails.show(book.id)
            }, ['Details']);

            const downloadButton = utils.createElement('button', {
                className: 'bg-blue-600 text-white px-2 py-1 rounded-md shadow hover:bg-blue-700 focus:ring focus:ring-blue-300',
                onclick: () => {
                    bookDetails.downloadBook(book);
                    // Hide results after initiating a download
                    elements.resultsSectionAccordion.hidden = true;
                }
            }, ['Download']);

            return utils.createElement('div', { className: 'flex gap-2' }, [buttonDetails, downloadButton]);
        },

        handleSearchError(error) {
            console.error('Search error:', error);
        
            if (elements.resultsTableBody) {
                elements.resultsTableBody.innerHTML = '';
                const errorRow = utils.createElement('tr', {}, [
                    utils.createElement('td', {
                        colSpan: '10',
                        textContent: 'An error occurred while searching. Please try again.'
                    })
                ]);
                elements.resultsTableBody.appendChild(errorRow);
            } else {
                console.error('Error: resultsTableBody element is missing in the DOM.');
            }
        }
    };

        // Add listener for "Hide Results" button
        elements.hideResultsButton.addEventListener('click', () => {
            elements.resultsSectionAccordion.hidden = true;
        });
        
    // Book Details Functions
    const bookDetails = {
        async show(bookId) {
            if (STATE.isLoadingDetails) return;
    
            try {
                STATE.isLoadingDetails = true;
    
                if (modal.open) {
                    modal.open();
                }
    
                if (elements.detailsContainer) {
                    elements.detailsContainer.innerHTML = '<p>Loading details...</p>';
                }
    
                const book = await utils.fetchJson(
                    `${API_ENDPOINTS.info}?id=${encodeURIComponent(bookId)}`
                );
    
                currentBookDetails = book;
                this.displayDetails(book);
            } catch (error) {
                console.error('Details error:', error);
                this.handleDetailsError(error);
            } finally {
                STATE.isLoadingDetails = false;
            }
        },

        displayDetails(book) {
            elements.detailsContainer.innerHTML = this.generateDetailsHTML(book);
            
            // Add event listeners
            document.getElementById('download-button')
                .addEventListener('click', () => this.downloadBook(book));
            document.getElementById('close-details')
                .addEventListener('click', modal.close);
        },

        generateDetailsHTML(book) {
            return `
                <div class="bg-white rounded-lg shadow-md p-6 space-y-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${book.title || 'No title available'}</h3>
                        <p class="text-gray-600"><strong>Author:</strong> ${book.author || 'N/A'}</p>
                        <p class="text-gray-600"><strong>Publisher:</strong> ${book.publisher || 'N/A'}</p>
                        <p class="text-gray-600"><strong>Year:</strong> ${book.year || 'N/A'}</p>
                        <p class="text-gray-600"><strong>Language:</strong> ${book.language || 'N/A'}</p>
                        <p class="text-gray-600"><strong>Format:</strong> ${book.format || 'N/A'}</p>
                        <p class="text-gray-600"><strong>Size:</strong> ${book.size || 'N/A'}</p>
                    </div>
        
                    <div class="flex space-x-4">
                        <button id="download-button" 
                                class="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 focus:ring focus:ring-blue-300">
                            Download
                        </button>
                        <button id="close-details" 
                                class="bg-gray-600 text-white px-4 py-2 rounded-md shadow hover:bg-gray-700 focus:ring focus:ring-gray-300">
                            Close
                        </button>
                    </div>
                </div>
            `;
        },

        generateInfoList(info) {
            if (!info) return '';

            const listItems = Object.entries(info)
                .map(([key, values]) => `
                    <li><strong>${key}:</strong> ${values.join(', ')}</li>
                `)
                .join('');

            return `<ul class="uk-list uk-list-bullet">${listItems}</ul>`;
        },

        async downloadBook(book) {
            if (!book) return;

            try {
                utils.showLoading(elements.searchLoading);
                utils.fetchJson(
                    `${API_ENDPOINTS.download}?id=${encodeURIComponent(book.id)}`
                ).then(() => {
                    modal.close();
                    status.fetch();
        
                    // Hide search results section
                    if (elements.resultsSectionAccordion) {
                        elements.resultsSectionAccordion.hidden = true;
                    }
                });
            } catch (error) {
                console.error('Download error:', error);
            } finally {
                utils.hideLoading(elements.searchLoading);
            }
        },

        handleDetailsError(error) {
            console.error('Details error:', error);
            elements.detailsContainer.innerHTML = `
                <p>Error loading details. Please try again.</p>
                <div class="details-actions">
                    <button id="close-details" onclick="modal.close()">Close</button>
                </div>
            `;
            document.getElementById('close-details')
                .addEventListener('click', modal.close);
        }
    };

    const status = {
        async fetch() {
            try {
                utils.showLoading(elements.statusLoading);
                const data = await utils.fetchJson(API_ENDPOINTS.status);
                this.display(data);
            } catch (error) {
                this.handleError(error);
            } finally {
                utils.hideLoading(elements.statusLoading);
            }
        },
    
        display(data) {
            // Clear existing content
            elements.statusTableBody.innerHTML = '';
            elements.statusCardContainer.innerHTML = '';
    
            // Handle each status type
            Object.entries(data).forEach(([status, booksInStatus]) => {
                if (Object.keys(booksInStatus).length > 0) {
                    Object.entries(booksInStatus).forEach(([bookId, bookData]) => {
                        this.addStatusRow(status, bookData);
                        this.addStatusCard(status, bookData);
                    });
                }
            });
        },
    
        addStatusRow(status, book) {
            if (!book.id || !book.title) return;
    
            const row = utils.createElement('tr', {}, [
                utils.createElement('td', { textContent: status }),
                utils.createElement('td', { textContent: book.id }),
                utils.createElement('td', { textContent: book.title }),
                this.createPreviewCell(book.preview),
            ]);
    
            elements.statusTableBody.appendChild(row);
        },
    
        addStatusCard(status, book) {
            if (!book.id || !book.title) return;
    
            const card = utils.createElement('div', {
                className: 'bg-white shadow rounded-md p-4 mb-4',
            }, [
                utils.createElement('div', { className: 'flex items-center justify-between' }, [
                    utils.createElement('h3', { className: 'text-lg font-semibold' }, book.title),
                    utils.createElement('span', {
                        className: 'text-sm font-medium text-gray-600',
                        textContent: status,
                    }),
                ]),
                utils.createElement('p', { className: 'text-sm text-gray-600 mt-2' }, `ID: ${book.id}`),
                book.preview
                    ? utils.createElement('img', {
                        src: book.preview,
                        alt: 'Book Preview',
                        className: 'w-16 h-16 mt-2',
                    })
                    : utils.createElement('p', { className: 'text-sm text-gray-600 mt-2' }, 'No preview available'),
            ]);
    
            elements.statusCardContainer.appendChild(card);
        },
    
        createPreviewCell(previewUrl) {
            if (!previewUrl) {
                return utils.createElement('td', { textContent: 'N/A' });
            }
    
            const img = utils.createElement('img', {
                src: previewUrl,
                alt: 'Book Preview',
                className: 'w-12 h-12',
            });
    
            return utils.createElement('td', {}, [img]);
        },
    
        handleError(error) {
            console.error('Status error:', error);
    
            if (elements.statusTableBody) {
                elements.statusTableBody.innerHTML = '';
                const errorRow = utils.createElement('tr', {}, [
                    utils.createElement('td', {
                        colSpan: '4',
                        textContent: 'Error loading status. Will retry automatically.',
                    }),
                ]);
                elements.statusTableBody.appendChild(errorRow);
            }
    
            if (elements.statusCardContainer) {
                elements.statusCardContainer.innerHTML = '';
                const errorCard = utils.createElement('div', {
                    className: 'bg-red-100 text-red-600 p-4 rounded-md',
                    textContent: 'Error loading status. Will retry automatically.',
                });
                elements.statusCardContainer.appendChild(errorCard);
            }
        },
    };

    // Modal Functions
    const modal = {
        open() {
            if (elements.modalOverlay) {
                elements.modalOverlay.classList.remove('hidden');
            } else {
                console.error('Error: modalOverlay element is missing in the DOM.');
            }
        },
        close() {
            if (elements.modalOverlay) {
                elements.modalOverlay.classList.add('hidden');
            } else {
                console.error('Error: modalOverlay element is missing in the DOM.');
            }
    
            if (elements.detailsContainer) {
                elements.detailsContainer.innerHTML = ''; // Clear content when closed
            } else {
                console.error('Error: detailsContainer element is missing in the DOM.');
            }
        }
    };

    // Event Listeners
    function setupEventListeners() {
        // Search events
        elements.searchButton.addEventListener('click', () => {
            const query = elements.searchInput.value.trim();
            if (query) search.performSearch(query);
        });

        elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = elements.searchInput.value.trim();
                if (query) search.performSearch(query);
            }
        });

        // Modal close on overlay click
        elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === elements.modalOverlay) {
                modal.close();
            }
        });

        // Keyboard accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.modalOverlay.classList.contains('active')) {
                modal.close();
            }
        });
    }

    // Dark Mode Logic
    const darkMode = {
        init() {
            // Check localStorage for saved preference
            const savedMode = localStorage.getItem('darkMode');
            if (savedMode === 'dark') {
                this.enable();
            } else {
                // Default to light mode if no preference or preference is 'light'
                this.disable(); 
            }
            this.addToggleListener();
        },

        enable() {
            elements.html.classList.add('dark');
            elements.sunIcon.classList.add('hidden');
            elements.moonIcon.classList.remove('hidden');
            localStorage.setItem('darkMode', 'dark');
        },

        disable() {
            elements.html.classList.remove('dark');
            elements.sunIcon.classList.remove('hidden');
            elements.moonIcon.classList.add('hidden');
            localStorage.setItem('darkMode', 'light');
        },

        toggle() {
            if (elements.html.classList.contains('dark')) {
                this.disable();
            } else {
                this.enable();
            }
        },

        addToggleListener() {
            if (elements.darkModeToggle) {
                elements.darkModeToggle.addEventListener('click', () => this.toggle());
            } else {
                console.error('Dark mode toggle button not found.');
            }
        }
    };

    // Initialize
    function init() {
        setupEventListeners();
        darkMode.init(); // Initialize dark mode
        status.fetch();
        setInterval(() => status.fetch(), REFRESH_INTERVAL);
    }

    init();
});
