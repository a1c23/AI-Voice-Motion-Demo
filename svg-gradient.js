// SVG Gradient Demo with Theme System
let isThinking = true;
let animationState = '';
let animationFrameId = null;
let currentTheme = 'original';

// Theme definitions - 3 themes, each has 3 colors (darkest, medium, lightest)
// Color used depends on state:
//   - AI speaking: colors[0] (darkest)
//   - User speaking: colors[1] (medium)
//   - Rest/Thinking: colors[2] (lightest)
const themes = {
  original: {
    colors: ['#2D9B4E', '#62D84E', '#B6FDF8'],  // dark green, lime, light cyan
    waveform: { start: [45, 155, 78], end: [182, 253, 248] }
  },
  sunset: {
    colors: ['#E85D04', '#FF8C61', '#FFCC70'],  // dark orange, coral, light yellow
    waveform: { start: [232, 93, 4], end: [255, 204, 112] }
  },
  purple: {
    colors: ['#7B2CBF', '#C77DFF', '#E0AAFF'],  // deep purple, violet, lavender
    waveform: { start: [123, 44, 191], end: [224, 170, 255] }
  }
};

// Color utility functions
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.min(255, Math.max(0, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function lightenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount
  );
}

// Get gradient colors for bottom and mid layers based on state
function getStateColors(themeName, state) {
  const theme = themes[themeName];
  if (!theme) return null;

  let baseColor;
  if (state === 'ai-speaking') {
    baseColor = theme.colors[0]; // darkest
  } else if (state === 'user-speaking') {
    baseColor = theme.colors[1]; // medium
  } else {
    baseColor = theme.colors[2]; // lightest (rest/thinking)
  }

  // Derive 4 gradient stops from base color
  return {
    bottom: [baseColor, lightenColor(baseColor, 0.25), lightenColor(baseColor, 0.45), lightenColor(baseColor, 0.65)],
    mid: [lightenColor(baseColor, 0.15), lightenColor(baseColor, 0.35), lightenColor(baseColor, 0.55), lightenColor(baseColor, 0.75)]
  };
}

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
const transitionDuration = 500;
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

// Audio visualization
const trailLength = numSquares * delayFrames;
const heightHistory = new Array(trailLength).fill(0);
let currentSmoothedValue = 0;

function animateVoice() {
  let targetValue = 0;

  const shouldBeAtRest = (animationState === 'system-at-rest' || animationState === 'system-thinking');
  if (shouldBeAtRest && animationState !== 'system-thinking') {
    for (let i = 0; i < heightHistory.length; i++) {
      heightHistory[i] *= 0.85;
    }
    currentSmoothedValue *= 0.9;
  } else if (animationState === 'ai-speaking') {
    targetValue = 0.3 + Math.sin(Date.now() / 500) * 0.2 + Math.random() * 0.1;
  } else if (animationState === 'user-speaking') {
    targetValue = 0.25 + Math.sin(Date.now() / 400) * 0.15 + Math.random() * 0.1;
  }

  const smoothingFactor = 0.15;
  currentSmoothedValue = currentSmoothedValue + (targetValue - currentSmoothedValue) * smoothingFactor;

  heightHistory.unshift(currentSmoothedValue);
  heightHistory.pop();

  // Get current theme colors for waveform
  const theme = themes[currentTheme];
  const waveStart = theme.waveform.start;
  const waveEnd = theme.waveform.end;

  const centerOutOrder = [2, 1, 3, 0, 4];
  centerOutOrder.forEach((index, i) => {
    const el = squares[index];
    if (!el) return;

    const curvedValue = heightHistory[i * delayFrames];
    const localMin = minHeights[index];

    let targetHeight;
    if (animationState === 'system-thinking') {
      targetHeight = 30;
    } else {
      targetHeight = localMin + curvedValue * (maxHeight - localMin);
    }

    let finalHeight = targetHeight;
    if (isTransitioning) {
      const elapsed = Date.now() - transitionStartTime;
      const progress = Math.min(elapsed / transitionDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      finalHeight = previousHeights[index] + (targetHeight - previousHeights[index]) * eased;
      if (progress >= 1) {
        isTransitioning = false;
      }
    } else {
      previousHeights[index] = targetHeight;
    }

    el.style.height = `${finalHeight}px`;
    el.style.width = '7px';

    const normalized = (targetHeight - localMin) / (maxHeight - localMin);
    const blur = normalized * 3;
    el.style.setProperty('--blur-amount', `${blur}px`);

    // Use theme colors for waveform gradient
    const r = Math.round(waveStart[0] + (waveEnd[0] - waveStart[0]) * normalized);
    const g = Math.round(waveStart[1] + (waveEnd[1] - waveStart[1]) * normalized);
    const b = Math.round(waveStart[2] + (waveEnd[2] - waveStart[2]) * normalized);
    const color1 = `rgb(${r}, ${g}, ${b})`;
    const color2 = `rgb(${Math.min(r + 10, 255)}, ${Math.min(g + 10, 255)}, ${Math.min(b + 10, 255)})`;

    el.style.setProperty('--color-1', color1);
    el.style.setProperty('--color-2', color2);

    if (animationState === 'system-thinking') {
      const time = Date.now() / 1000;
      const waveSpeed = 0.25;
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
    thinkingLayers.style.display = 'flex';
    setTimeout(() => {
      thinkingLayers.style.transform = 'scale(1)';
      thinkingLayers.style.opacity = '1';
    }, 10);
    toggleBtn.classList.add('active');
  } else {
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

// Update status display
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
let currentLayer = 'a';

// Update gradient colors based on theme AND state
function updateGradientColors(themeName, state) {
  const stateColors = getStateColors(themeName, state || animationState);
  if (!stateColors) return;

  // Update bottom layer SVG gradient stops
  document.querySelectorAll('.gradient-svg-bottom').forEach(svg => {
    const stops = svg.querySelectorAll('linearGradient stop');
    stops.forEach((stop, i) => {
      if (stateColors.bottom[i]) {
        stop.setAttribute('stop-color', stateColors.bottom[i]);
      }
    });
  });

  // Update mid layer SVG gradient stops
  document.querySelectorAll('.gradient-svg-mid').forEach(svg => {
    const stops = svg.querySelectorAll('linearGradient stop');
    stops.forEach((stop, i) => {
      if (stateColors.mid[i]) {
        stop.setAttribute('stop-color', stateColors.mid[i]);
      }
    });
  });
}

// Set theme
function setTheme(themeName) {
  if (!themes[themeName]) return;

  currentTheme = themeName;
  updateGradientColors(themeName, animationState);

  // Update active button state
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeName);
  });

  // Persist preference
  localStorage.setItem('svg-gradient-theme', themeName);
}

// Set animation state
function setAnimationState(state) {
  if (animationState === state) return;

  const wasThinking = animationState === 'system-thinking';
  const willBeThinking = state === 'system-thinking';
  if (wasThinking !== willBeThinking) {
    isTransitioning = true;
    transitionStartTime = Date.now();
  }

  animationState = state;
  updateStatusDisplay(state);
  updateStateButtons();

  // Update SVG gradient colors based on new state
  updateGradientColors(currentTheme, state);
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
  if (squares.length === 0) {
    createWaveformSquares();
  }
  if (!animationFrameId) {
    animateVoice();
  }

  setAnimationState(targetState);
  updateStateButtons();
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  createWaveformSquares();

  // Set thinking toggle button as active on load
  document.getElementById('thinking-toggle').classList.add('active');

  // Activate layer-a for all layers
  document.querySelectorAll('.layer-a').forEach(el => el.classList.add('active'));

  // Initialize to system-at-rest state first (so setTheme can use it)
  animationState = 'system-at-rest';

  // Load saved theme or use default
  const savedTheme = localStorage.getItem('svg-gradient-theme') || 'original';
  // Validate saved theme still exists (in case themes were reduced)
  const validTheme = themes[savedTheme] ? savedTheme : 'original';
  setTheme(validTheme);

  // Update display for initial state
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

  // Theme button events
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const themeName = btn.dataset.theme;
      setTheme(themeName);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') toggleThinking();
    // Theme shortcuts: 1-3 (only 3 themes now)
    if (e.key >= '1' && e.key <= '3') {
      const themeNames = Object.keys(themes);
      const index = parseInt(e.key) - 1;
      if (themeNames[index]) {
        setTheme(themeNames[index]);
      }
    }
  });
});
