/**
 * Provider System Exports
 */

// Base
export { BaseProvider, type ProviderConfig, type GenerationOptions, type GenerationResult, type ProviderHealth, type ProviderType, PROVIDER_TYPES } from './base/BaseProvider';

// Image Providers
export { HuggingFaceProvider, StabilityAIProvider, LocalImageProvider, imageProviders, ImageProviderRegistry } from './image/ImageProviders';

// TTS Providers
export { ElevenLabsProvider, CoquiTTSProvider, SystemTTSProvider, ttsProviders, TTSProviderRegistry } from './tts/TTSProviders';

// Apple ML Providers (Vision, Speech, NLP)
export { 
  VisionTextRecognitionProvider, 
  SpeechRecognitionProvider, 
  NaturalLanguageProvider, 
  appleMLProviders,
  AppleMLProviderRegistry 
} from './apple/AppleMLProviders';

// Apple Native Providers (RealityKit, ARKit, Spatial Video)
export { 
  RealityKitProvider, 
  ARKitProvider, 
  SpatialVideoProvider, 
  AppleNativeBridge,
  appleNativeProviders,
  AppleNativeProviderRegistry 
} from './apple/AppleNativeProviders';

// Unified Manager
export { providerManager, ProviderManager, type ProviderStatus } from './ProviderManager';
