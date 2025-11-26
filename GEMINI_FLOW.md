# Gemini Demo Flow Documentation

## Overview
The Gemini demo implements a real-time bidirectional voice conversation using Google's Gemini 2.0 Multimodal Live API with natural conversation rhythm through artificial delays and voice activity detection.

## Architecture

### Dual AudioContext System
- **Input Context**: 16kHz sample rate for microphone → Gemini API
- **Output Context**: 24kHz sample rate for Gemini audio → speakers
- **Reason**: Gemini requires 16kHz input but sends 24kHz output

### State Machine
Four primary states:
1. `system-at-rest` - Idle state (green waveform at minimum)
2. `user-speaking` - User is talking (blue waveform)
3. `system-thinking` - Processing delay (green shimmer animation)
4. `ai-speaking` - AI is responding (green waveform)

## Conversation Flow

### 1. Connection Phase
**Trigger**: User clicks voice toggle button

**What Happens**:
1. Request microphone access
2. Initialize dual AudioContext (16kHz input, 24kHz output)
3. Create audio analysers for visualization
4. Connect to Gemini WebSocket API
5. Send setup message with model config and system instructions
6. Start streaming microphone audio
7. Set state to `system-at-rest`

**No Delays**: Immediate connection

---

### 2. User Starts Speaking
**Trigger**: Voice activity detected (audio level > 0.01 threshold)

**What Happens**:
1. Voice activity detection monitors microphone audio in real-time
2. When audio amplitude exceeds threshold:
   - Clear any pending silence timeout
   - Set `isUserSpeaking = true`
   - Switch to `user-speaking` state (blue waveform)
   - Start sending audio chunks to Gemini

**No Delays**: Immediate state change

**Technical Details**:
- Audio analyzed every ~93ms (4096 samples @ 16kHz)
- Threshold: 0.01 amplitude (filters background noise)
- All audio sent to Gemini via WebSocket in `realtimeInput` format

---

### 3. User Pauses or Stops Speaking
**Trigger**: Audio level drops below threshold for 1.7 seconds

**What Happens**:
1. When audio falls below threshold, start 1.7-second silence timer
2. If user resumes speaking before 1.7s, timer is cancelled
3. If 1.7s passes without speech:
   - Set `isUserSpeaking = false`
   - Call `startThinkingDelay()`

**Artificial Delay #1: 1.7-second silence detection**
- **Purpose**: Allow natural pauses in user speech
- **Example**: User can say "I need to..." *pause* "check my PTO balance" without triggering end of turn

---

### 4. Thinking Mode Begins
**Trigger**: 1.7 seconds of silence after user stops speaking

**What Happens**:
1. Set `isInThinkingDelay = true`
2. Switch to `system-thinking` state (green shimmer)
3. Start 1.7-second thinking timer
4. Any AI audio arriving during this period is **buffered**, not played

**Artificial Delay #2: 1.7-second thinking delay**
- **Purpose**: Create natural conversation rhythm, prevent AI from interrupting too quickly
- **Example**: Simulates human "thinking pause" before responding

**Audio Buffering**:
- All Gemini audio chunks arriving during thinking delay are stored in `audioBuffer[]`
- Not played until thinking delay completes

---

### 5. AI Starts Responding
**Trigger**: 1.7-second thinking delay completes

**What Happens**:
1. Set `isInThinkingDelay = false`
2. If buffered audio exists:
   - Set `isAISpeaking = true`
   - Switch to `ai-speaking` state (green waveform)
   - Play all buffered audio chunks sequentially
   - Clear audio buffer
3. If no buffered audio yet:
   - Return to `system-at-rest`
   - Wait for audio to arrive

**No Additional Delays**: Audio plays immediately after thinking delay

**Audio Playback**:
- Buffered chunks play in order received
- New chunks arriving after thinking delay play immediately
- AudioContext manages seamless playback timing

---

### 6. AI Finishes Speaking
**Trigger**: All audio chunks played and `activeSources` array is empty

**What Happens**:
1. Last audio source triggers `onended` event
2. Set `isAISpeaking = false`
3. Switch to `system-at-rest` state

**No Delays**: Immediate state change

---

### 7. Turn Complete
**Trigger**: Gemini sends `turnComplete` event

**What Happens**:
1. Reset user transcript
2. Set `isUserSpeaking = false`
3. Ready for next conversation turn

---

## Timing Summary

| Event | Delay | Type | Purpose |
|-------|-------|------|---------|
| Voice detected | 0ms | - | Immediate feedback |
| User stops speaking | 1.7s | Silence detection | Allow pauses |
| Thinking mode | 1.7s | Artificial delay | Natural rhythm |
| AI audio playback | 0ms | - | After thinking completes |
| Turn complete | 0ms | - | Immediate reset |

**Total delay from user silence to AI audio**: ~3.4 seconds (1.7s + 1.7s)

---

## Special Cases

### User Interrupts AI
**Trigger**: Voice activity detected while `isAISpeaking = true`

**What Happens**:
1. Stop all AI audio playback immediately
2. Clear audio buffer
3. Cancel thinking delay if active
4. Reset to `user-speaking` state
5. Gemini receives `interrupted` event and stops generating

**No Delays**: Immediate interruption

---

### AI Audio Arrives Before Thinking Delay Ends
**Trigger**: Gemini responds very quickly (< 1.7s)

**What Happens**:
1. Audio chunks are buffered in `audioBuffer[]`
2. Thinking delay continues for full 1.7s
3. Buffered audio plays after delay completes

**Effect**: Maintains natural conversation rhythm even with fast AI responses

---

### AI Audio Arrives After Thinking Delay
**Trigger**: Gemini responds slowly (> 1.7s after user stops)

**What Happens**:
1. Thinking delay completes, no buffered audio
2. Return to `system-at-rest` briefly
3. When audio arrives, immediately switch to `ai-speaking`
4. Play audio without additional delay

**Effect**: No awkward silence, but preserves minimum thinking pause

---

## WebSocket Message Flow

### Outgoing (Browser → Gemini)
```javascript
{
  realtimeInput: {
    mediaChunks: [{
      mimeType: "audio/pcm;rate=16000",
      data: "<base64-encoded-audio>"
    }]
  }
}
```
Sent every ~93ms while user is speaking

### Incoming (Gemini → Browser)
```javascript
{
  setupComplete: true  // Initial confirmation
}

{
  serverContent: {
    modelTurn: {
      parts: [{
        inlineData: {
          mimeType: "audio/pcm;rate=24000",
          data: "<base64-audio>"
        }
      }]
    },
    inputTranscription: { text: "user speech..." },
    outputTranscription: { text: "AI response..." },
    turnComplete: true,
    interrupted: true,
    generationComplete: true
  }
}
```

---

## Configuration

### Voice Activity Detection
- **Threshold**: 0.01 amplitude
- **Silence Duration**: 1700ms (1.7 seconds)
- **Sample Rate**: 16kHz
- **Buffer Size**: 4096 samples (~93ms chunks)

### Thinking Delay
- **Duration**: 1700ms (1.7 seconds)
- **Configurable**: `this.thinkingDelay` in constructor

### Audio Settings
- **Input**: 16kHz mono PCM, echo cancellation + noise suppression enabled
- **Output**: 24kHz mono PCM
- **Analyser FFT**: 64 bins for visualization

### Gemini Model
- **Model**: `gemini-2.0-flash-exp`
- **Voice**: Puck
- **Response Modality**: Audio only

---

## State Transitions Diagram

```
[Connection]
     ↓
[system-at-rest] ←──────────────────┐
     ↓                               │
  Voice detected                     │
     ↓                               │
[user-speaking] ─────────────────────┤
     ↓                               │
  1.7s silence                       │
     ↓                               │
[system-thinking]                    │
     ↓                               │
  1.7s delay + buffered audio        │
     ↓                               │
[ai-speaking] ───────────────────────┘
     ↓
  Audio ends
     ↓
  (loop back to rest)
```

---

## Key Implementation Files

- `gemini-voice.js` - Core API integration and state management
- `gemini-demo.js` - UI logic and animation control
- `gemini-demo.html` - Demo interface

---

## Notes

- The dual 1.7-second delays create a natural conversation rhythm
- Voice activity detection prevents accidental triggering from background noise
- Audio buffering ensures smooth playback after thinking delay
- Interruption support allows natural conversation flow
- All timing is configurable via class properties
