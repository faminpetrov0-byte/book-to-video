# LiveKit AI Narrator Agent
# Python script for running AI narrator using livekit-agents

from livekit import agents
from livekit.plugins import openai, deepgram, cartesia, silero

# ============== CONFIGURATION ==============
class NarratorConfig:
    """Configuration for AI Narrator"""
    
    # STT - Speech to Text
    STT_PROVIDER = "deepgram"
    STT_MODEL = "nova-3"
    
    # LLM - Language Model  
    LLM_PROVIDER = "openai"
    LLM_MODEL = "gpt-4o"
    
    # TTS - Text to Speech
    TTS_PROVIDER = "cartesia"
    TTS_MODEL = "sonic-3"
    TTS_VOICE = "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"  # Narrator voice
    
    # VAD - Voice Activity Detection
    VAD_MODEL = "silero"
    
    # Instructions
    NARRATOR_INSTRUCTIONS = """
    You are a professional audiobook narrator. 
    Read the provided text with emotion, proper pacing, and expression.
    Adapt your tone to match the mood of the content - dramatic for action scenes,
    gentle for romance, mysterious for thrillers.
    
    Speak clearly and at a natural pace suitable for audiobook narration


# ============== NARRATOR.
    """ AGENT ==============
class NarratorAgent(agents.Agent):
    """AI Narrator Agent for Book-to-Video"""
    
    def __init__(self, text: str = None):
        self.text_to_narrate = text
        super().__init__(
            instructions=NarratorConfig.NARRATOR_INSTRUCTIONS,
            llm=openai.LLM(model=NarratorConfig.LLM_MODEL),
            stt=deepgram.STT(model=NarratorConfig.STM_MODEL),
            tts=cartesia.TTS(
                model=NarratorConfig.TTS_MODEL,
                voice=NarratorConfig.TTS_VOICE
            ),
            vad=silero.VAD.load(),
        )
    
    async def on_start(self):
        """Called when agent starts"""
        print("🎙️ AI Narrator started")
        
    async def on_enter(self):
        """Called when agent enters the session"""
        if self.text_to_narrate:
            # Narrate the provided text
            await self.session.generate_reply(
                instructions=f"Narrate the following text: {self.text_to_narrate}"
            )
        else:
            # Wait for user input
            await self.session.generate_reply(
                instructions="Ask the user what text they would like you to narrate."
            )


# ============== MULTI-CHARACTER AGENT ==============
class CharacterNarratorAgent(agents.Agent):
    """Agent that can voice multiple characters"""
    
    CHARACTERS = {
        "narrator": {
            "voice": "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
            "description": "Default narrator voice",
        },
        "male_deep": {
            "voice": "male-deep-voice-id",
            "description": "Deep male voice",
        },
        "female_gentle": {
            "voice": "female-gentle-voice-id", 
            "description": "Gentle female voice",
        },
    }
    
    def __init__(self, scenes: list = None):
        self.scenes = scenes or []
        super().__init__(
            instructions="""
            You are a multi-character audiobook narrator.
            Different characters in the story should have different voices.
            Use the appropriate voice for each character.
            
            Character voices:
            - Narrator: Default storytelling voice
            - Male characters: Use deeper tones
            - Female characters: Use gentler tones
            
            Match emotions and personalities through voice modulation.
            """,
            llm=openai.LLM(model=NarratorConfig.LLM_MODEL),
            tts=cartesia.TTS(
                model=NarratorConfig.TTS_MODEL,
                voice=NarratorConfig.TTS_VOICE
            ),
        )
    
    async def on_enter(self):
        """Process scenes and narrate with character voices"""
        for scene in self.scenes:
            character = scene.get("character", "narrator")
            text = scene.get("text", "")
            
            voice_id = self.CHARACTERS.get(character, {}).get("voice", NarratorConfig.TTS_VOICE)
            
            # Would switch voice here in production
            await self.session.generate_reply(
                instructions=f"Narrate as {character}: {text}"
            )


# ============== MAIN ENTRY POINT ==============
@agents.rtc_session()
async def entrypoint(ctx: agents.JobContext):
    """Main entry point for LiveKit agent"""
    
    session = agents.AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model=NarratorConfig.STM_MODEL),
        llm=openai.LLM(model=NarratorConfig.LLM_MODEL),
        tts=cartesia.TTS(
            model=NarratorConfig.TTS_MODEL,
            voice=NarratorConfig.TTS_VOICE
        ),
    )
    
    # Create narrator agent
    agent = NarratorAgent()
    
    # Start session
    await session.start(agent=agent, room=ctx.room)
    
    # Greet user
    await session.generate_reply(
        instructions="Greet the user and ask what they would like to narrate."
    )


# ============== RUN ==============
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="LiveKit AI Narrator Agent")
    parser.add_argument("--text", type=str, help="Text to narrate")
    parser.add_argument("--multi-character", action="store_true", help="Enable multi-character mode")
    args = parser.parse_args()
    
    # Run with CLI
    agents.cli.run_app(
        agents.Entrypoint(
            params=agents.BuildWorkerParams(
                defaults={
                    agents.AgentType.NARRATOR: NarratorAgent(text=args.text) if not args.multi_character else CharacterNarratorAgent()
                }
            )
        )
    )
