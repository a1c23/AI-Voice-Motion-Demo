// Simple toggle between voice and thinking mode
let isThinking = true; // Start with thinking mode on
let animationState = ''; // Will be set to 'system-at-rest' on load
let audioContext = null;
let analyser = null;
let animationFrameId = null;
let isVoiceActive = false;
//let localpath = 'https://assets.codepen.io/15841116/';
let localpath = '';

// Voice animation setup
const maxHeight = 100;
const numSquares = 5;
const centerIndex = Math.floor(numSquares / 2);
const delayFrames = 3.0;
const row = document.getElementById('wave-row');
const squares = [];

// Transition tracking for smooth height changes
let isTransitioning = false;
let transitionStartTime = 0;
const transitionDuration = 500; // milliseconds
let previousHeights = new Array(numSquares).fill(0);

// Thinking status cycling
let thinkingStatusMessages = [];
let currentStatusIndex = 0;
let statusCycleInterval = null;

// Default fake status messages for thinking state
const defaultThinkingMessages = [
  "Checking PTO balance",
  "Reviewing company time-off policy",
  "Preparing a summary"
];

// Configurable timing (milliseconds per message)
const defaultStatusDelay = 2500; // 2.5 seconds per message (3 messages in ~7.5 seconds)

// Oval-shaped minHeight setup
const baseMinHeight = 10;
const centerBoost = 2.8;
const minHeights = [];

for (let i = 0; i < numSquares; i++) {
  const distance = Math.abs(i - centerIndex);
  const factor = 1 - (distance / centerIndex);
  const boosted = baseMinHeight + factor * baseMinHeight * (centerBoost - 1);
  minHeights.push(boosted);
}

// Create waveform squares
function createWaveformSquares() {
  row.innerHTML = '';
  squares.length = 0;

  for (let i = 0; i < numSquares; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'square-wrapper';

    const square = document.createElement('div');
    square.className = 'square';

    wrapper.appendChild(square);
    row.appendChild(wrapper);
    squares.push(square);
  }
}

// Audio visualization
const trailLength = numSquares * delayFrames;
const heightHistory = new Array(trailLength).fill(0);

let dynamicThreshold = 15;
const baseThreshold = 15;
const maxThreshold = 40;
const thresholdDecay = 0.5;
const activityBoost = 20;
const smoothingFactor = 0.2;

function animateVoice() {
  // Use appropriate analyser based on who is speaking
  let currentAnalyser = analyser;
  const isAISpeaking = animationState === 'ai-speaking';
  const isUserSpeaking = animationState === 'user-speaking';

  if (isAISpeaking && window.geminiVoice && window.geminiVoice.getAIAnalyser) {
    currentAnalyser = window.geminiVoice.getAIAnalyser();
  } else if (isUserSpeaking && window.geminiVoice && window.geminiVoice.getUserAnalyser) {
    currentAnalyser = window.geminiVoice.getUserAnalyser();
  }

  // If no analyser available, still animate but with zero data
  let raw = 0;
  if (currentAnalyser) {
    const dataArray = new Uint8Array(currentAnalyser.frequencyBinCount);
    currentAnalyser.getByteFrequencyData(dataArray);

    // For AI audio, check multiple frequency bins and use max for more reliable detection
    if (isAISpeaking) {
      raw = Math.max(dataArray[1] || 0, dataArray[2] || 0, dataArray[3] || 0, dataArray[4] || 0);
    } else {
      raw = dataArray[2] || 0;
    }
  }

  // Adjust threshold
  if (raw > dynamicThreshold + 5) {
    dynamicThreshold = Math.min(dynamicThreshold + activityBoost, maxThreshold);
  } else {
    dynamicThreshold = Math.max(baseThreshold, dynamicThreshold - thresholdDecay);
  }

  // Apply noise gate and curve
  const gated = Math.max(raw - dynamicThreshold, 0);
  const curved = (gated / (255 - dynamicThreshold)) ** 2.2;

  // Smooth the value - use slower decay for AI to maintain animation between chunks
  const current = heightHistory[0];
  const targetSmoothing = isAISpeaking ? 0.1 : smoothingFactor;
  const smoothed = curved === 0 ? 0 : current + (curved - current) * targetSmoothing;

  heightHistory.unshift(smoothed);
  heightHistory.pop();


  // In rest/thinking state, decay the waveform to minimum
  const shouldBeAtRest = (animationState === 'system-at-rest' || animationState === 'system-thinking') || !isVoiceActive;
  if (shouldBeAtRest && animationState !== 'system-thinking') {
    // Decay height history to zero (but not during thinking - we want the wave effect)
    for (let i = 0; i < heightHistory.length; i++) {
      heightHistory[i] *= 0.85; // Smooth decay
    }
  } else if (isAISpeaking) {
    // During AI speaking, apply slower decay to maintain animation between chunks
    for (let i = 0; i < heightHistory.length; i++) {
      if (heightHistory[i] > 0) {
        heightHistory[i] *= 0.96; // Very slow decay to bridge gaps between chunks
      }
    }
  }

  // Animate center-outward
  const centerOutOrder = [2, 1, 3, 0, 4];
  centerOutOrder.forEach((index, i) => {
    const el = squares[index];
    if (!el) return;

    const curvedValue = heightHistory[i * delayFrames];

    // Use original minimum heights
    const localMin = minHeights[index];

    // Calculate target height based on state
    let targetHeight;
    if (animationState === 'system-thinking') {
      targetHeight = 30; // Fixed medium height for thinking mode
    } else {
      targetHeight = localMin + curvedValue * (maxHeight - localMin);
    }

    // Interpolate during transition
    let finalHeight = targetHeight;
    if (isTransitioning) {
      const elapsed = Date.now() - transitionStartTime;
      const progress = Math.min(elapsed / transitionDuration, 1);

      // Ease-out cubic easing
      const eased = 1 - Math.pow(1 - progress, 3);

      finalHeight = previousHeights[index] + (targetHeight - previousHeights[index]) * eased;

      // End transition when complete
      if (progress >= 1) {
        isTransitioning = false;
      }
    } else {
      // Store current height for next potential transition
      previousHeights[index] = targetHeight;
    }

    el.style.height = `${finalHeight}px`;
    el.style.width = '7px';

    const normalized = (targetHeight - localMin) / (maxHeight - localMin);
    const blur = normalized * 3;
    el.style.setProperty('--blur-amount', `${blur}px`);

    // Color based on who's speaking
    let color1, color2;

    if (animationState === 'user-speaking') {
      // Blue gradient for user: #5FC5D7 → #614FEE (2 colors)
      // Interpolate between teal and purple based on normalized
      const r = Math.round(95 + (97 - 95) * normalized);
      const g = Math.round(197 + (79 - 197) * normalized);
      const b = Math.round(215 + (238 - 215) * normalized);
      color1 = `rgb(${r}, ${g}, ${b})`;
      color2 = `rgb(${Math.min(r + 10, 255)}, ${Math.min(g + 10, 255)}, ${Math.min(b + 10, 255)})`;
    } else if (animationState === 'ai-speaking' || animationState === 'system-thinking') {
      // System gradient: #62D84E → #4DD5FE (2 colors)
      // Interpolate between green and cyan based on normalized
      const r = Math.round(98 + (77 - 98) * normalized);
      const g = Math.round(216 + (213 - 216) * normalized);
      const b = Math.round(78 + (254 - 78) * normalized);
      color1 = `rgb(${r}, ${g}, ${b})`;
      color2 = `rgb(${Math.min(r + 10, 255)}, ${Math.min(g + 10, 255)}, ${Math.min(b + 10, 255)})`;
    } else {
      // System colors for rest state: #62D84E → #4DD5FE (2 colors, same as system gradient)
      const r = Math.round(98 + (77 - 98) * normalized);
      const g = Math.round(216 + (213 - 216) * normalized);
      const b = Math.round(78 + (254 - 78) * normalized);
      color1 = `rgb(${r}, ${g}, ${b})`;
      color2 = `rgb(${Math.min(r + 10, 255)}, ${Math.min(g + 10, 255)}, ${Math.min(b + 10, 255)})`;
    }

    el.style.setProperty('--color-1', color1);
    el.style.setProperty('--color-2', color2);

    // Traveling wave effect for system-thinking state (waveform only)
    if (animationState === 'system-thinking') {
      // Create a wave that travels across all squares
      // Use time-based animation for smooth wave motion
      const time = Date.now() / 1000; // seconds
      const waveSpeed = 0.25; // wave cycles per second (half speed, very slow)
      const phase = (time * waveSpeed - (index / numSquares)) % 1; // 0 to 1 (reversed direction)

      // Create a sine wave for smooth fade in/out
      const opacity = 0.3 + 0.7 * Math.abs(Math.sin(phase * Math.PI * 2));
      el.style.opacity = opacity;
    } else {
      // Reset opacity for other states
      el.style.opacity = 1;
    }
  });

  animationFrameId = requestAnimationFrame(animateVoice);
}

// Toggle thinking mode
function toggleThinking() {
  isThinking = !isThinking;

  const thinkingLayers = document.getElementById('thinking-layers');
  const toggleBtn = document.getElementById('thinking-toggle');

  if (isThinking) {
    // Animate thinking gradients in
    thinkingLayers.style.display = 'flex';
    setTimeout(() => {
      thinkingLayers.style.transform = 'scale(1)';
      thinkingLayers.style.opacity = '1';
    }, 10);
    toggleBtn.classList.add('active');
  } else {
    // Animate thinking gradients out
    thinkingLayers.style.transform = 'scale(0.7)';
    thinkingLayers.style.opacity = '0';
    setTimeout(() => {
      thinkingLayers.style.display = 'none';
    }, 300);
    toggleBtn.classList.remove('active');
  }
}

// Get display label for animation state
function getStateLabel(state) {
  const labels = {
    'user-speaking': 'Listening',
    'ai-speaking': 'Speaking',
    'system-thinking': 'Thinking',
    'system-at-rest': 'Chilling'
  };
  return labels[state] || 'Chilling';
}

// Start cycling through thinking status messages
function startStatusCycle(messages, delayPerMessage = 3000) {
  console.log('🔄 startStatusCycle called with:', messages, 'delay:', delayPerMessage);
  // Stop any existing cycle
  stopStatusCycle();

  if (!messages || messages.length === 0) {
    console.log('⚠️ No messages to display');
    return;
  }

  thinkingStatusMessages = messages;
  currentStatusIndex = 0;

  const statusEl = document.getElementById('status-display');
  if (!statusEl) {
    console.log('⚠️ status-display element not found!');
    return;
  }

  // Display first message immediately
  console.log('✅ Setting status text to:', thinkingStatusMessages[0]);
  statusEl.textContent = thinkingStatusMessages[0];

  // Cycle through messages if multiple messages
  if (thinkingStatusMessages.length > 1) {
    console.log('🔄 Starting interval for', thinkingStatusMessages.length, 'messages with', delayPerMessage, 'ms delay');
    statusCycleInterval = setInterval(() => {
      currentStatusIndex = (currentStatusIndex + 1) % thinkingStatusMessages.length;
      console.log('🔄 Cycling to message', currentStatusIndex, ':', thinkingStatusMessages[currentStatusIndex]);
      statusEl.textContent = thinkingStatusMessages[currentStatusIndex];
    }, delayPerMessage);
  }
}

// Stop cycling status messages
function stopStatusCycle() {
  if (statusCycleInterval) {
    clearInterval(statusCycleInterval);
    statusCycleInterval = null;
  }
  thinkingStatusMessages = [];
  currentStatusIndex = 0;
}

// Show fake status messages (can be called manually or automatically)
function showFakeStatus(messages, delayPerMessage = defaultStatusDelay) {
  console.log('🎭 Showing fake status with', messages.length, 'messages');
  startStatusCycle(messages, delayPerMessage);
}

// Global API for manual status injection
window.showStatusMessages = function(messages, delayPerMessage = defaultStatusDelay) {
  console.log('🌐 Global showStatusMessages called');
  showFakeStatus(messages, delayPerMessage);
};

// Track which layer is currently active for crossfading
let currentLayer = 'a'; // 'a' or 'b'

// Image mapping for each state
const stateImages = {
  'user-speaking': {
    bottom: 'bottom-user.png',
    mid: 'mid-user.png',
    top: 'top-user.png'
  },
  'ai-speaking': {
    bottom: 'bottom.png',
    mid: 'mid.png',
    top: 'top.png'
  },
  'system-thinking': {
    bottom: 'bottom-rest.png',
    mid: 'mid-rest.png',
    top: 'top.png'
  },
  'system-at-rest': {
    bottom: 'bottom-rest.png',
    mid: 'mid-rest.png',
    top: 'top.png'
  }
};

// Set animation state based on who is speaking
function setAnimationState(state) {
  if (animationState === state) return; // Already in this state

  // Trigger transition if moving to/from thinking state
  const wasThinking = animationState === 'system-thinking';
  const willBeThinking = state === 'system-thinking';
  if (wasThinking !== willBeThinking) {
    isTransitioning = true;
    transitionStartTime = Date.now();
  }

  // Auto-trigger fake status messages when entering thinking state
  if (!wasThinking && willBeThinking) {
    console.log('🎭 Auto-triggering fake status for thinking state');
    showFakeStatus(defaultThinkingMessages, defaultStatusDelay);
  }

  // Stop status cycling when leaving thinking state
  if (wasThinking && !willBeThinking) {
    stopStatusCycle();
  }

  animationState = state;

  // Update state button active states
  updateStateButtons();

  // Get images for this state
  const images = stateImages[state];
  if (!images) return;

  // Toggle to the other layer for crossfade
  const nextLayer = currentLayer === 'a' ? 'b' : 'a';

  // Update background images on the next layer
  const layers = ['bottom', 'mid', 'top'];
  layers.forEach(layerName => {
    const layerEl = document.getElementById(`layer-${layerName}`);
    const nextLayerImg = layerEl.querySelector(`.layer-${nextLayer}`);
    nextLayerImg.style.backgroundImage = `url('${images[layerName]}')`;
  });

  // Crossfade: hide current, show next
  document.querySelectorAll(`.layer-${currentLayer}`).forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`.layer-${nextLayer}`).forEach(el => el.classList.add('active'));

  // Update current layer tracker
  currentLayer = nextLayer;
}

// Toggle voice conversation
function toggleVoice() {
  const voiceBtn = document.getElementById('voice-toggle');

  if (!isVoiceActive) {
    // Start voice conversation
    if (!window.geminiVoice.apiKey) {
      alert('Please set your Google AI Studio API key first');
      return;
    }

    // Ensure waveform squares are created
    if (squares.length === 0) {
      createWaveformSquares();
    }

    // NOTE: Don't call initAudio() here - geminiVoice.start() handles its own mic access
    // The AI's audio analyser will be used for waveform visualization

    // Ensure waveform animation is running
    if (!animationFrameId) {
      animateVoice();
    }

    // Set state BEFORE starting to prevent double-clicks
    isVoiceActive = true;
    voiceBtn.classList.add('active');

    // Start async - error handler will reset state if it fails
    window.geminiVoice.start();
  } else {
    // Stop voice conversation
    window.geminiVoice.stop();
    isVoiceActive = false;
    voiceBtn.classList.remove('active');
    setAnimationState('system-at-rest');
  }
}

// Set API key
function setAPIKey() {
  const apiKeyField = document.getElementById('api-key-field');
  const apiKey = apiKeyField.value.trim();

  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }

  // Save to localStorage
  localStorage.setItem('gemini_api_key', apiKey);

  // Initialize Gemini voice
  window.geminiVoice.init(apiKey);

  // Update UI - hide all API key UI when set
  document.getElementById('api-key-input').style.display = 'none';
  document.getElementById('api-key-status').style.display = 'none';
  apiKeyField.value = '';
}

// Clear API key
function clearAPIKey() {
  if (confirm('Are you sure you want to clear your API key?')) {
    localStorage.removeItem('gemini_api_key');
    window.geminiVoice.apiKey = null;

    // Stop voice if active
    if (isVoiceActive) {
      toggleVoice();
    }

    // Update UI
    document.getElementById('api-key-input').style.display = 'flex';
    document.getElementById('api-key-status').style.display = 'none';
  }
}

// Load API key from localStorage on startup
function loadAPIKey() {
  const savedKey = localStorage.getItem('gemini_api_key');

  if (savedKey) {
    window.geminiVoice.init(savedKey);
    // Hide all API key UI when key is set
    document.getElementById('api-key-input').style.display = 'none';
    document.getElementById('api-key-status').style.display = 'none';
    return true;
  }

  return false;
}

// Update state button active states
function updateStateButtons() {
  const buttons = document.querySelectorAll('.state-btn');
  if (!buttons.length) return; // Buttons not yet loaded

  buttons.forEach(btn => {
    const btnState = btn.getAttribute('data-state');
    if (btnState === animationState) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Handle manual state change from state buttons
function handleStateButtonClick(targetState) {
  // Stop voice conversation if active
  if (isVoiceActive) {
    toggleVoice();
  }

  // Ensure waveform is created and animating
  if (squares.length === 0) {
    createWaveformSquares();
  }
  if (!animationFrameId) {
    animateVoice();
  }

  // Set the animation state
  setAnimationState(targetState);
  updateStateButtons();
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  createWaveformSquares();

  // Set thinking toggle button as active on load
  document.getElementById('thinking-toggle').classList.add('active');

  // Initialize layer-a with rest state images
  const restImages = stateImages['system-at-rest'];
  document.querySelector('#layer-bottom .layer-a').style.backgroundImage = `url('${restImages.bottom}')`;
  document.querySelector('#layer-mid .layer-a').style.backgroundImage = `url('${restImages.mid}')`;
  document.querySelector('#layer-top .layer-a').style.backgroundImage = `url('${restImages.top}')`;
  document.querySelectorAll('.layer-a').forEach(el => el.classList.add('active'));

  // Initialize to system-at-rest state (apply CSS classes and button states)
  animationState = 'system-at-rest';
  updateStateButtons();

  // Load saved API key
  loadAPIKey();

  // Button events
  document.getElementById('thinking-toggle').addEventListener('click', toggleThinking);
  document.getElementById('voice-toggle').addEventListener('click', toggleVoice);
  document.getElementById('api-key-submit').addEventListener('click', setAPIKey);

  // State buttons are NOT clickable on demo page - they only show current state
  // (Commenting out state button click handlers)
  // document.querySelectorAll('.state-btn').forEach(btn => {
  //   btn.addEventListener('click', () => {
  //     const targetState = btn.getAttribute('data-state');
  //     handleStateButtonClick(targetState);
  //   });
  // });

  // Clear button might not exist initially, check first
  const clearBtn = document.getElementById('api-key-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAPIKey);
  }

  // Also add listener when we show the status (after setting key)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'api-key-clear') {
      clearAPIKey();
    }
  });

  // API key input - Enter key
  document.getElementById('api-key-field').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') setAPIKey();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') toggleThinking();
    if (e.key === 'v' || e.key === 'V') toggleVoice();
    // Alt+K to clear API key
    if (e.altKey && (e.key === 'k' || e.key === 'K')) clearAPIKey();
  });

  // Set up Gemini voice callbacks
  window.geminiVoice.onStateChange = (state) => {
    setAnimationState(state);
  };

  window.geminiVoice.onError = (error) => {
    console.error('Voice error:', error);

    // Provide more helpful message for permission errors
    if (error.includes('Permission') || error.includes('permission')) {
      alert(`Microphone access required!\n\nTo use Now Assist voice:\n1. Click the address bar\n2. Click the camera/microphone icon\n3. Allow microphone access\n4. Try again\n\nError details: ${error}`);
    } else {
      alert(`Voice error: ${error}`);
    }

    isVoiceActive = false;
    document.getElementById('voice-toggle').classList.remove('active');
  };

  // Note: onStatusUpdate callback removed - using fake status system instead

  // Don't initialize audio until user clicks voice button
});
