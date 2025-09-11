# River's Stream Metadata Service

Fetches and serves river images from river streams with optional image resizing capabilities.

## Features

- **Image Retrieval**: Fetches encrypted images from river streams
- **Image Resizing**: Dynamic image resizing with various format support
- **Caching**: Optimized caching strategies for original and resized images
- **Multiple Endpoints**: Support for space images, user profile images, and general media

## API Endpoints

### Image Endpoints with Size Support

All image endpoints now support an optional `size` query parameter for dynamic resizing:

#### Space Images

```
GET /space/:spaceAddress/image[?size=WxH]
GET /space/:spaceAddress/image/:eventId[?size=WxH]
```

#### User Profile Images

```
GET /user/:userId/image[?size=WxH]
```

#### Media Content

```
GET /media/:mediaStreamId?key=...&iv=...[&size=WxH]
```

### Size Parameter Format

The `size` parameter supports three formats:

- **`WxH`** (e.g., `200x200`) - Resize to specific width and height
- **`Wx`** (e.g., `300x`) - Resize to specific width, maintain aspect ratio
- **`xH`** (e.g., `x150`) - Resize to specific height, maintain aspect ratio

#### Examples:

- `/space/0x123.../image?size=200x200` - 200x200 pixels
- `/user/0xabc.../image?size=x100` - 100px height, proportional width
- `/space/0x456.../image?size=150x` - 150px width, proportional height

### Supported Image Formats

Resizing is supported for:

- JPEG (`image/jpeg`, `image/jpg`)
- PNG (`image/png`)
- WebP (`image/webp`)
- TIFF (`image/tiff`)
- BMP (`image/bmp`)
- GIF (`image/gif`) - Including animated GIFs

### Format Handling

- **Static images**: Resized and converted to **WebP format** for optimal compression
- **Animated GIFs**: **Resized** to specified dimensions while **preserving all animation frames** (output as GIF)
- **Size parameters are respected** for both static and animated images

### Limitations

- Maximum dimension: 4096px (width or height)
- Images are not upscaled (won't make small images larger)
- Resized images are converted to WebP format for optimization
- Minimum dimension: 1px

## Development

### Start the blockchains, river node, and the stream-metadata service

```bash
# from river root:
./scripts/start_dev.sh
```

### Local development in vscode

Run `./scripts/start_dev.sh`, and then kill the stream-metadata service. Running the script will:

- build all the dependencies: core/_, packages/_, etc
- start the base chain, river chain, and river node

```bash
cd packages/stream-metadata
yarn dev
```

### Testing Image Processing

You can test the image processing functionality:

```bash
# Run image processing tests
yarn build && node dist/test-image-processing.cjs
```

## Caching Strategy

- **Processed and original images**: Long-term immutable cache (`max-age=31536000, immutable`)
- **Error responses**: Short-term cache (`max-age=30, s-maxage=3600`)

## Technical Details

- Built with **Fastify** web framework
- Image processing powered by **Sharp** library
- Encrypted image decryption and streaming
- Zod schema validation for parameters
- Comprehensive error handling and logging
