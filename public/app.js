// State
let isLoginMode = true;
let currentUser = null;

// DOM Elements
const authView = document.getElementById('auth-view');
const homeView = document.getElementById('home-view');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthBtn = document.getElementById('toggle-auth');
const authSwitchText = document.getElementById('auth-switch-text');
const welcomeMsg = document.getElementById('welcome-msg');
const logoutBtn = document.getElementById('logout-btn');
const notification = document.getElementById('notification');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const spinner = document.getElementById('loading-spinner');
const voiceBtn = document.getElementById('voice-btn');

// Initialize
function init() {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    
    if (token && userJson) {
        currentUser = JSON.parse(userJson);
        showHomeView();
    } else {
        showAuthView();
    }
}

// UI Toggles
function toggleAuthMode(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        authTitle.textContent = 'Welcome Back';
        authSubtitle.textContent = 'Login to continue to your dashboard';
        authSubmitBtn.textContent = 'Login';
        authSwitchText.innerHTML = `Don't have an account? <a href="#" id="toggle-auth">Register</a>`;
    } else {
        authTitle.textContent = 'Create Account';
        authSubtitle.textContent = 'Join NexStore today';
        authSubmitBtn.textContent = 'Register';
        authSwitchText.innerHTML = `Already have an account? <a href="#" id="toggle-auth">Login</a>`;
    }
    
    document.getElementById('toggle-auth').addEventListener('click', toggleAuthMode);
}

function showHomeView() {
    authView.classList.remove('active');
    setTimeout(() => {
        homeView.classList.add('active');
        welcomeMsg.textContent = `Hello, ${currentUser.username}`;
    }, 400); // Wait for fade out
}

function showAuthView() {
    homeView.classList.remove('active');
    setTimeout(() => {
        authView.classList.add('active');
    }, 400);
}

function showToast(message, type = 'success') {
    notification.textContent = message;
    notification.className = `toast show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Auth Handlers
async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showToast('Please enter both username and password', 'error');
        return;
    }
    
    const endpoint = isLoginMode ? '/users/login' : '/users/register';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Authentication failed');
        }
        
        if (isLoginMode) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            showToast('Login successful!');
            showHomeView();
        } else {
            showToast('Registration successful! Please login.');
            toggleAuthMode({ preventDefault: () => {} });
            document.getElementById('password').value = '';
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleLogout() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            await fetch('/users/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showToast('Logged out successfully');
    showAuthView();
    searchResults.innerHTML = '';
    searchInput.value = '';
}

// Unified Search Execution
async function executeSearch(query) {
    searchResults.innerHTML = '';
    spinner.classList.remove('hidden');
    
    try {
        const response = await fetch(`/search?search=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        console.log("Search API raw response data:", data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Search failed');
        }
        
        renderResults(data);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        spinner.classList.add('hidden');
    }
}

// Search Handler
async function handleSearch(e) {
    e.preventDefault();
    
    const query = searchInput.value.trim();
    if (!query) return;
    
    await executeSearch(query);
}

// Voice Search Capture and Streaming
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

async function handleVoiceSearch() {
    if (isRecording) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.title = 'Speak to Search';
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await streamTranscription(audioBlob);
            };

            mediaRecorder.start();
            isRecording = true;
            voiceBtn.classList.add('recording');
            voiceBtn.title = 'Stop and Transcribe';
            showToast('Listening... Speak now.', 'success');
        } catch (err) {
            console.error('Error accessing microphone:', err);
            showToast('Microphone access denied or not available.', 'error');
        }
    }
}

async function streamTranscription(audioBlob) {
    searchResults.innerHTML = '';
    spinner.classList.remove('hidden');
    searchInput.value = '';
    searchInput.placeholder = 'Transcribing voice...';

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');

    try {
        const response = await fetch('/search/audio-stream', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Transcription streaming failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedQuery = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const textChunk = decoder.decode(value, { stream: true });
            const lines = textChunk.split('\n');

            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const dataPayload = line.replace('data: ', '').trim();
                    if (dataPayload === '[DONE]') {
                        break;
                    }
                    try {
                        const parsed = JSON.parse(dataPayload);
                        if (parsed.text) {
                            accumulatedQuery += ' ' + parsed.text;
                            searchInput.value = accumulatedQuery.trim();
                        }
                    } catch (e) {
                        // Incomplete chunk
                    }
                }
            }
        }

        const finalQuery = searchInput.value.trim();
        if (finalQuery) {
            showToast(`Transcribed: "${finalQuery}". Searching...`, 'success');
            await executeSearch(finalQuery);
        } else {
            showToast('Could not hear or transcribe any voice.', 'error');
            searchInput.placeholder = 'e.g. A laptop with great battery life for coding...';
        }

    } catch (err) {
        console.error('Transcription failed:', err);
        showToast(err.message || 'Transcription error occurred', 'error');
        searchInput.placeholder = 'e.g. A laptop with great battery life for coding...';
    } finally {
        spinner.classList.add('hidden');
    }
}

function renderResults(results) {
    console.log("renderResults received results:", results);
    if (!results || results.length === 0) {
        searchResults.innerHTML = '<p class="no-results">No products found matching your search.</p>';
        return;
    }
    
    results.forEach(product => {
        const score = Number(product.hybrid_score || 0).toFixed(5);
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-score">Score: ${score}</div>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-desc">${product.description}</p>
            ${product.relevance_explanation ? `<div class="product-reason"><strong>AI Analysis:</strong> ${product.relevance_explanation}</div>` : ''}
        `;
        
        searchResults.appendChild(card);
    });
}

// Event Listeners
toggleAuthBtn.addEventListener('click', toggleAuthMode);
authForm.addEventListener('submit', handleAuthSubmit);
logoutBtn.addEventListener('click', handleLogout);
searchForm.addEventListener('submit', handleSearch);
voiceBtn.addEventListener('click', handleVoiceSearch);

// Start
init();
