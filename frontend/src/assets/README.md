# Assets Directory

This directory contains static assets for the TreeHole application.

## Structure

- `sounds/` - Audio files for notifications and feedback
  - `timer-end.mp3` - Sound played when timer reaches zero
  - `payment-success.mp3` - Sound played on successful payment
  - `error.mp3` - Sound played on errors
  - `timer-warning.mp3` - Sound played for timer warnings

## Adding Assets

To add new assets:

1. Place files in appropriate subdirectories
2. Import them in your JavaScript modules using relative paths
3. For images, consider using WebP format for better performance
4. For sounds, use MP3 or OGG formats for broad browser support

## Usage Examples

```javascript
// Import images
import logo from './images/logo.svg';

// Import sounds (handled by SoundManager)
const sounds = {
  timerEnd: './assets/sounds/timer-end.mp3',
  paymentSuccess: './assets/sounds/payment-success.mp3'
};
```

## Optimization

- Compress images before adding them
- Use appropriate formats (SVG for icons, WebP for photos)
- Keep file sizes reasonable for web performance