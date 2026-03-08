/**
 * LiveKit Frontend Components
 * React components for real-time video/audio with AI agents
 */

import React, { useEffect, useState } from 'react';
import { 
  LiveKitRoom, 
  VideoTrack, 
  AudioTrack,
  useTracks,
  formatChatMessageLinks,
  isTrackReference,
} from '@livekit/components-react';
import { 
  Track, 
  RoomEvent, 
  ConnectionState,
  Room,
  LocalParticipant,
  RemoteParticipant,
} from 'livekit-client';
import './styles.css';

// ============== LIVEKIT ROOM COMPONENT ==============
interface LiveKitRoomProps {
  serverUrl: string;
  token: string;
  children?: React.ReactNode;
}

export function LiveKitVideoRoom({ serverUrl, token, children }: LiveKitRoomProps) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={true}
    >
      <div className="lk-room">
        {children || <DefaultRoomContent />}
      </div>
    </LiveKitRoom>
  );
}

function DefaultRoomContent() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  return (
    <div className="lk-grid">
      {tracks.map((trackRef) => (
        <VideoTrack 
          key={trackRef.participant.identity} 
          trackRef={trackRef} 
          className="lk-video-track"
        />
      ))}
    </div>
  );
}

// ============== AI NARRATOR PANEL ==============
interface AINarratorPanelProps {
  agentName?: string;
  onStart?: () => void;
  onStop?: () => void;
  isPlaying?: boolean;
}

export function AINarratorPanel({ 
  agentName = 'narrator',
  onStart,
  onStop,
  isPlaying = false 
}: AINarratorPanelProps) {
  const [transcript, setTranscript] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="ai-narrator-panel">
      <div className="panel-header">
        <h3>🎙️ AI Narrator</h3>
        <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Active' : 'Idle'}
        </span>
      </div>
      
      <div className="transcript-area">
        <p>{transcript || 'Waiting for narration...'}</p>
      </div>
      
      <div className="controls">
        {!isPlaying ? (
          <button onClick={onStart} className="btn-primary">
            ▶ Start Narration
          </button>
        ) : (
          <button onClick={onStop} className="btn-secondary">
            ⏹ Stop
          </button>
        )}
      </div>
      
      <div className="agent-info">
        <small>Agent: {agentName}</small>
      </div>
    </div>
  );
}

// ============== VIDEO CONFERENCE ==============
interface VideoConferenceProps {
  roomName: string;
  userName?: string;
}

export function VideoConference({ roomName, userName = 'User' }: VideoConferenceProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);

  return (
    <div className="video-conference">
      <div className="conference-header">
        <h4>📹 Video Conference</h4>
        <span className="room-name">{roomName}</span>
      </div>
      
      <LiveKitRoom
        serverUrl={process.env.LIVEKIT_URL || 'wss://your-server.livekit.io'}
        token={''} // Would be generated from backend
        connect={true}
        onConnectionStateChanged={(state) => setConnectionState(state)}
      >
        <ConferenceGrid />
      </LiveKitRoom>
      
      <div className="conference-controls">
        <ConnectionIndicator state={connectionState} />
      </div>
    </div>
  );
}

function ConferenceGrid() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  return (
    <div className="conference-grid">
      {tracks.map((track) => (
        <div key={track.participant.identity} className="participant-tile">
          {isTrackReference(track) && (
            <VideoTrack trackRef={track} />
          )}
          <div className="participant-name">
            {track.participant.identity}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConnectionIndicator({ state }: { state: ConnectionState }) {
  const labels: Record<ConnectionState, string> = {
    [ConnectionState.Disconnected]: 'Disconnected',
    [ConnectionState.Connecting]: 'Connecting...',
    [ConnectionState.Reconnecting]: 'Reconnecting...',
    [ConnectionState.Connected]: 'Connected',
  };
  
  return (
    <span className={`connection-indicator ${state.toLowerCase()}`}>
      {labels[state]}
    </span>
  );
}

// ============== AUDIO VISUALIZER ==============
interface AudioVisualizerProps {
  participantId?: string;
}

export function AudioVisualizer({ participantId }: AudioVisualizerProps) {
  // Uses LiveKit's audio visualization
  return (
    <div className="audio-visualizer">
      <div className="waveform">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
  );
</div>
    }

// ============== CHAT TRANSCRIPT ==============
interface ChatTranscriptProps {
  messages?: Array<{ id: string; message: string; name: string; timestamp: number }>;
}

export function ChatTranscript({ messages = [] }: ChatTranscriptProps) {
  return (
    <div className="chat-transcript">
      <h4>💬 Transcript</h4>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <span className="sender">{msg.name}:</span>
            <span className="text">{msg.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============== LIVE STREAM PLAYER ==============
interface LiveStreamPlayerProps {
  streamUrl: string;
  title?: string;
}

export function LiveStreamPlayer({ streamUrl, title }: LiveStreamPlayerProps) {
  return (
    <div className="live-stream-player">
      {title && <h4>{title}</h4>}
      <div className="video-container">
        <LiveKitRoom
          serverUrl={streamUrl}
          token={''}
          connect={true}
          audio={true}
          video={true}
        >
          <DefaultRoomContent />
        </LiveKitRoom>
      </div>
      <div className="live-badge">
        🔴 LIVE
      </div>
    </div>
  );
}

// ============== EXPORT DEFAULT ==============
export default {
  LiveKitVideoRoom,
  AINarratorPanel,
  VideoConference,
  AudioVisualizer,
  ChatTranscript,
  LiveStreamPlayer,
};
