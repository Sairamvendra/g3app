# AI Visual Studio - Feature Summary

## What Was Built

This application is a comprehensive AI-powered visual creation studio that combines:

### Core Technologies

- **Google Gemini Imagen 3**: For high-fidelity image generation
- **Google Veo 3.1**: For professional video generation
- **Replicate Video Models**: 6 different cutting-edge video generation models

## New Replicate Video Pipeline

### Supported Models

1. **MiniMax Video-01** (`minimax/video-01`)
   - Supports both text-to-video and image-to-video
   - Max duration: 6 seconds
   - Aspect ratios: 16:9, 9:16, 1:1

2. **LTX Video** (`lightricks/ltx-video`)
   - Fast generation optimized for speed
   - Configurable frame count (up to 257 frames)
   - Aspect ratios: 16:9, 9:16, 1:1, 21:9

3. **Hunyuan Video** (`tencent/hunyuan-video`)
   - Tencent's advanced model for complex scenes
   - Configurable resolution (720p, 1080p)
   - Max duration: 5 seconds

4. **Mochi 1** (`genmo/mochi-1-preview`)
   - State-of-the-art motion realism
   - Extensive inference steps control (up to 100)
   - Guidance scale tuning for creative control

5. **Kling Video** (`fofr/kling-video`)
   - Professional-grade quality
   - Longest duration support (up to 10 seconds)
   - CFG scale control for precision

6. **Hunyuan I2V** (`tencent/hunyuan-video-i2v`)
   - Specialized image-to-video conversion
   - Requires start image input
   - Smooth motion generation

### Key Features Added

#### 1. Replicate Service Module (`services/replicateService.ts`)

- Complete integration with Replicate API
- Model-specific configuration handling
- Automatic input preparation based on model requirements
- Error handling with user-friendly messages
- Support for both text-to-video and image-to-video workflows

#### 2. Type Definitions (`types.ts`)

- `ReplicateVideoSettings` interface for model configuration
- Model metadata including supported aspect ratios and durations
- Type safety for all video generation parameters

#### 3. UI Components

- **Replicate Video Generation Panel**
  - Expandable/collapsible section
  - Model selector dropdown with descriptions
  - Configurable parameters:
    - Aspect ratio
    - Duration
    - Inference steps
    - Guidance scale
    - CFG scale (model-specific)
  - API key management
  - Status indicators

- **API Key Modal**
  - Separate modal for Replicate API key configuration
  - Validation to prevent mixing Gemini and Replicate keys
  - Local storage persistence
  - Visual feedback for key status

- **Video Preview**
  - Unified preview area for both Veo and Replicate videos
  - Model badge showing which engine generated the video
  - Separate download buttons for each video type
  - Loading states with appropriate messages

#### 4. Integration with Existing Features

- Shares the same prompt input and reference images
- Uses existing video frame upload functionality
- Compatible with character references and story flow
- Maintains consistent UI/UX with the rest of the app

#### 5. Smart Banners Module (`components/SmartBanners.tsx`)

- **Multi-Ratio Reframing**: Intelligent resizing of images to standard ad formats:
  - Landscape (16:9), Portrait (9:16), Square (1:1)
  - Standard (4:3), Vertical (3:4), Cinema (21:9)
  - Classic 35mm (3:2), Portrait 35mm (2:3)
  - Medium Format (5:4), Portrait Med (4:5)
- **Batch Processing**: Select multiple aspect ratios to generate simultaneously.
- **AI-Powered Editing**:
  - Click "Edit with AI" on any generated asset.
  - Provide natural language instructions to refine the banner.
- **Direct Export**: Download individual assets with one click.
- **Workflow**:
  1. Upload a source banner/image.
  2. Select target aspect ratios.
  3. Click "Analyze & Reframe" to generate variants using `google/nano-banana-pro`.

## User Workflow

### Generating Videos with Replicate

1. **Enter a prompt** in the main prompt field
2. **(Optional)** Upload start/end frame images for image-to-video models
3. **Expand the "Replicate Video Models" section**
4. **Select a model** from the dropdown (6 options)
5. **Configure settings**:
   - Choose aspect ratio
   - Set duration
   - Adjust inference steps for quality vs. speed
   - Tune guidance scale for creative control
6. **Configure API key** (if not already set)
7. **Click "Generate with Replicate"**
8. **Wait for generation** (1-3 minutes depending on model)
9. **Download the video** using the purple download button

### Comparing Models

Users can easily experiment with different models by:

1. Generating a video with one model
2. Changing the model in the dropdown
3. Adjusting model-specific parameters
4. Generating again to compare results

The UI maintains both Veo and Replicate videos separately, allowing direct comparison.

## Technical Implementation Details

### API Integration

- **Authentication**: Replicate API key stored in localStorage
- **Request Flow**:
  1. Validate API key
  2. Prepare model-specific inputs
  3. Submit generation request
  4. Poll for completion
  5. Return video URL

### Error Handling

- API key validation before generation
- Clear error messages for common issues:
  - Missing API key
  - Invalid key format
  - Insufficient credits
  - Model-specific errors
- Automatic modal prompts for missing configuration

### Performance Optimizations

- Lazy loading of video generation modules
- Expandable sections to reduce initial UI complexity
- Client-side validation before API calls
- Efficient state management to prevent unnecessary re-renders

## Configuration

### Environment Variables

```env
GEMINI_API_KEY=your_gemini_key
REPLICATE_API_KEY=your_replicate_key
```

### Runtime Configuration

Both API keys can be configured through the UI:

- Gemini: Click key icon in header
- Replicate: Click "Configure API Key" in Replicate panel

Keys are stored in browser localStorage for persistence across sessions.

## Cost Considerations

### Replicate Pricing

- Video generation costs vary by model and duration
- Typical range: $0.02 - $0.10 per generation
- Longer durations and higher quality settings increase cost
- Monitor usage at replicate.com/account

### Optimization Tips

- Use faster models (LTX Video) for testing
- Reduce inference steps during iteration
- Increase quality settings only for final renders
- Set appropriate duration limits

## Future Enhancements

Potential additions:

- Batch video generation
- Video editing and trimming
- Custom model fine-tuning
- Style transfer for videos
- Animation curve controls
- Multi-shot video sequences
- Audio integration

---

**Note**: This implementation provides a production-ready foundation for video generation with Replicate, fully integrated with the existing Gemini/Veo pipeline.
