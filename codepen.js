// Simple toggle between voice and thinking mode
let isThinking = true; // Start with thinking mode on
let animationState = ''; // Will be set to 'system-at-rest' on load
let animationFrameId = null;

// Asset path for CodePen
const assetPath = 'https://assets.codepen.io/15841116/';

// Voice animation setup
const maxHeight = 100;
const numSquares = 7;
const centerIndex = Math.floor(numSquares / 2);
const delayFrames = 3.0;
const row = document.getElementById('wave-row');
const squares = [];

// Transition tracking for smooth height changes
let isTransitioning = false;
let transitionStartTime = 0;
const transitionDuration = 500; // milliseconds
let previousHeights = new Array(numSquares).fill(0);

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

// Audio visualization (using dummy data for demo)
const trailLength = numSquares * delayFrames;
const heightHistory = new Array(trailLength).fill(0);
let currentSmoothedValue = 0; // Track smoothed value between frames

function animateVoice() {
  // Generate dummy waveform data for demo purposes
  let targetValue = 0;

  // In thinking mode, keep waveform at minimum
  const shouldBeAtRest = (animationState === 'system-at-rest' || animationState === 'system-thinking');
  if (shouldBeAtRest && animationState !== 'system-thinking') {
    // Decay height history to zero (but not during thinking - we want the wave effect)
    for (let i = 0; i < heightHistory.length; i++) {
      heightHistory[i] *= 0.85; // Smooth decay
    }
    currentSmoothedValue *= 0.9; // Smooth decay for current value
  } else if (animationState === 'ai-speaking') {
    // Generate some audio activity for AI speaking demo with slower variation
    targetValue = 0.3 + Math.sin(Date.now() / 500) * 0.2 + Math.random() * 0.1;
  } else if (animationState === 'user-speaking') {
    // Generate some audio activity for user speaking demo with slower variation
    targetValue = 0.25 + Math.sin(Date.now() / 400) * 0.15 + Math.random() * 0.1;
  }

  // Smooth the transition between values
  const smoothingFactor = 0.15;
  currentSmoothedValue = currentSmoothedValue + (targetValue - currentSmoothedValue) * smoothingFactor;

  heightHistory.unshift(currentSmoothedValue);
  heightHistory.pop();

  // Animate center-outward
  const centerOutOrder = [3, 2, 4, 1, 5, 0, 6];
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
      const r = Math.round(95 + (97 - 95) * normalized);
      const g = Math.round(197 + (79 - 197) * normalized);
      const b = Math.round(215 + (238 - 215) * normalized);
      color1 = `rgb(${r}, ${g}, ${b})`;
      color2 = `rgb(${Math.min(r + 10, 255)}, ${Math.min(g + 10, 255)}, ${Math.min(b + 10, 255)})`;
    } else if (animationState === 'ai-speaking' || animationState === 'system-thinking') {
      // System gradient: #62D84E → #4DD5FE (2 colors)
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
      const time = Date.now() / 1000;
      const waveSpeed = 0.25; // wave cycles per second (half speed, very slow)
      const phase = (time * waveSpeed - (index / numSquares)) % 1;

      const opacity = 0.3 + 0.7 * Math.abs(Math.sin(phase * Math.PI * 2));
      el.style.opacity = opacity;
    } else {
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

// Update status display with state and optional transcript
function updateStatusDisplay(state, transcript = '') {
  const statusEl = document.getElementById('status-display');
  if (!statusEl) return;

  const label = getStateLabel(state);

  if (transcript) {
    const truncated = transcript.length > 50 ? transcript.substring(0, 50) + '...' : transcript;
    statusEl.textContent = `${label}: "${truncated}"`;
  } else {
    statusEl.textContent = label;
  }
}

// Track which layer is currently active for crossfading
let currentLayer = 'a'; // 'a' or 'b'

// Image mapping for each state (with asset path)
const stateImages = {
  'user-speaking': {
    bottom: assetPath + 'bottom-user.png',
    mid: assetPath + 'mid-user.png',
    top: assetPath + 'top-user.png'
  },
  'ai-speaking': {
    bottom: assetPath + 'bottom.png',
    mid: assetPath + 'mid.png',
    top: assetPath + 'top.png'
  },
  'system-thinking': {
    bottom: assetPath + 'bottom-rest.png',
    mid: assetPath + 'mid-rest.png',
    top: assetPath + 'top.png'
  },
  'system-at-rest': {
    bottom: assetPath + 'bottom-rest.png',
    mid: assetPath + 'mid-rest.png',
    top: assetPath + 'top.png'
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

  animationState = state;

  // Update status display with new state
  updateStatusDisplay(state);

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

// Update state button active states
function updateStateButtons() {
  const buttons = document.querySelectorAll('.state-btn');
  if (!buttons.length) return;

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

  // Initialize to system-at-rest state
  animationState = 'system-at-rest';
  updateStatusDisplay('system-at-rest');
  updateStateButtons();

  // Start animation
  animateVoice();

  // Button events
  document.getElementById('thinking-toggle').addEventListener('click', toggleThinking);

  // State button events
  document.querySelectorAll('.state-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetState = btn.getAttribute('data-state');
      handleStateButtonClick(targetState);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') toggleThinking();
  });
});
