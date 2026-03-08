# LiveKit Cloud Deployment Guide

## Free Tier Overview

LiveKit Cloud offers a **generous free tier**:
- **5,000 minutes** of video/audio per month
- **Unlimited** rooms
- **3** projects
- Perfect for development and small projects

---

## Step 1: Create LiveKit Cloud Account

1. Go to https://cloud.livekit.io
2. Sign up with GitHub or email
3. Create a new project
4. Get your credentials:
   - `URL` (e.g., `wss://your-project.livekit.io`)
   - `API Key`
   - `API Secret`

---

## Step 2: Configure Environment Variables

```bash
# .env
LIVEKIT_URL=wss://your-project.livekit.io
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

---

## Step 3: Update Backend

```typescript
// backend/src/config.ts
export const config = {
  // ... existing config
  livekit: {
    url: process.env.LIVEKIT_URL || 'wss://your-project.livekit.io',
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
  },
};
```

---

## Step 4: Generate Tokens

```typescript
// In production, use livekit-server-sdk
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

function generateRoomToken(params: {
  roomName: string;
  participantName: string;
  isAgent?: boolean;
}) {
  const { roomName, participantName, isAgent = false } = params;
  
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: participantName,
      name: participantName,
    }
  );
  
  token.addGrant(new VideoGrant({
    room: roomName,
    roomJoin: true,
    canPublish: !isAgent,
    canSubscribe: true,
  }));
  
  return token.toJwt();
}
```

---

## Step 5: Run AI Agent

```bash
# Install LiveKit Agents
pip install "livekit-agents[openai,deepgram,cartesia]"

# Set environment
export LIVEKIT_URL="wss://your-project.livekit.io"
export LIVEKIT_API_KEY="your_api_key"
export LIVEKIT_API_SECRET="your_api_secret"

# Run the agent
python backend/scripts/livekit_narrator.py --text "Once upon a time..."
```

---

## Step 6: Deploy

### Option A: Vercel (Frontend + API)

```bash
cd frontend
vercel deploy
```

### Option B: Docker

```bash
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - LIVEKIT_URL=${LIVEKIT_URL}
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
```

---

## Free Tier Limits

| Feature | Free | Paid |
|---------|------|------|
| Minutes/month | 5,000 | Unlimited |
| Projects | 3 | Unlimited |
| Concurrent rooms | 25 | Unlimited |
| Storage | 10 GB | Unlimited |
| Support | Community | Priority |

---

## Cost Optimization Tips

1. **Use TURN servers wisely** - LiveKit provides TURN
2. **Disable video when not needed** - Audio-only saves minutes
3. **Limit room size** - More participants = more minutes
4. **Use VAD** - Voice activity detection reduces usage
5. **Record selectively** - Egress adds to minute count

---

## Monitoring

Dashboard: https://cloud.livekit.io/projects/p_/usage

Track:
- Minutes used
- Active rooms
- Bandwidth
- Egress storage

---

## Troubleshooting

### Connection Issues
```bash
# Check your URL format
wss://project-name.livekit.io  # Correct
ws://...  # Wrong - must use wss
```

### Token Errors
- Ensure API key/secret are correct
- Check token expiration (default: 1 hour)

### Audio/Video Not Working
- Check browser permissions
- Ensure TURN servers are accessible
- Check network/firewall

---

## Next Steps

1. Create account at https://cloud.livekit.io
2. Get credentials
3. Update `.env`
4. Test locally
5. Deploy!

---

*Part of Book-to-Video AI v3.0*
