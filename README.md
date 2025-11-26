# AI Voice Demo

Real-time bidirectional voice conversation demos with animated AI avatar visualizations.

## Features

- Real-time voice conversations with AI assistants
- Animated waveform visualizations that respond to voice activity
- Multiple conversation states: listening (blue), thinking (green shimmer), speaking (green)
- Dual implementation support: OpenAI Realtime API and Google Gemini 2.0 Multimodal Live API
- Smooth state transitions with crossfading background layers
- Natural conversation rhythm with 1.7-second pauses

## Demos

### OpenAI Realtime API Demo
- **File**: `demo.html`
- **API**: OpenAI Realtime API
- **Voice**: Alloy
- **Audio**: 24kHz PCM

### Google Gemini Demo
- **File**: `gemini-demo.html`
- **API**: Google Gemini 2.0 Multimodal Live API
- **Voice**: Puck
- **Audio**: 16kHz input, 24kHz output with dual AudioContext architecture

### State Testing (No API Key Required)
- **File**: `index.html`
- Open this file to manually test all conversation states
- Click the state buttons at the bottom to switch between:
  - **Rest** (green idle state)
  - **Listening** (blue waveform - user speaking)
  - **Thinking** (green shimmer animation)
  - **Speaking** (green waveform - AI responding)
- Perfect for testing animations, visual design, and state transitions without needing API access

## Setup

### Prerequisites
- Modern web browser with Web Audio API support
- Microphone access
- API key from either:
  - [OpenAI Platform](https://platform.openai.com/api-keys) (for demo.html)
  - [Google AI Studio](https://aistudio.google.com/apikey) (for gemini-demo.html)

### Running the Demo

1. Open `demo.html` (OpenAI) or `gemini-demo.html` (Gemini) in a web browser
2. Enter your API key when prompted
3. Click the voice toggle button to start conversation
4. Grant microphone permissions when requested
5. Start speaking!

### API Key Security

- API keys are stored locally in browser localStorage
- Keys are never transmitted except to the respective API providers
- Never share demo links with your API key set
- Use the "Clear Key" button to remove stored keys

## Controls

- **T**: Toggle thinking mode visualization
- **V**: Toggle voice conversation
- **Alt+K**: Clear API key
- **Enter**: Submit API key

## Architecture

### Conversation States

1. **system-at-rest**: Idle state (green)
2. **user-speaking**: User is talking (blue waveform)
3. **system-thinking**: Processing with 1.7s delay (green shimmer)
4. **ai-speaking**: AI is responding (green waveform)

### Audio Processing

- Dual AudioContext architecture for Gemini (16kHz input, 24kHz output)
- Single AudioContext for OpenAI (24kHz)
- Real-time audio visualization using AnalyserNode
- Audio buffering during thinking delays for natural conversation flow

## Files

- `index.html` - State testing demo (no API key required)
- `demo.html` - OpenAI demo HTML
- `demo.js` - OpenAI demo UI logic
- `chatgpt-voice.js` - OpenAI Realtime API integration
- `gemini-demo.html` - Gemini demo HTML
- `gemini-demo.js` - Gemini demo UI logic
- `gemini-voice.js` - Google Gemini Multimodal Live API integration
- `script.js` - Shared UI logic for state testing
- `style.css` - Shared styles for all demos
- `*.png` - Background layer images for different states

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with microphone permissions)

## License

MIT
