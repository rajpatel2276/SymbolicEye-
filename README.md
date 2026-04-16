# OBSERVER_v0.1 [BETA]

A high-performance, real-time ASCII neural visualization engine. This project transforms a standard webcam feed into a stylized, interactive ASCII stream with specialized vision modes and motion-saliency detection.

## 🛠 Technical Highlights

- **Temporal Throttling:** Logic-locked at 30 FPS to stabilize the main thread during heavy per-pixel traversal and text rendering.
- **Ghost Echo (Saliency):** Implemented using a custom frame-delta algorithm. By comparing the current luminance buffer against the previous frame (`Uint8ClampedArray`), the engine isolates and highlights movement.
- **Chroma Saturation Engine:** A custom vision mode that pushes $RGB$ saturation levels before mapping to ASCII characters for more vibrant visuals.
- **Bit Density Control:** Real-time scaling of the ASCII grid resolution, balancing computational load with visual fidelity.

## 🎨 UI/UX Features

- **Glassmorphism HUD:** A minimalist, translucent control pill built with Tailwind v4, designed to keep the focus on the neural stream.
- **Vision Modes:** - `Raw`: Direct $RGB$ to ASCII mapping.
  - `Phosphor`: Classic green-channel monochrome.
  - `Nebula`: HSL-based psychedelic gradient.
  - `Chroma`: Enhanced saturation mapping.
- **Focus Mode:** Hides the HUD and scales the viewport for an immersive experience.

## 🚀 Built With

- **React + TypeScript:** For strict type safety and component-driven architecture.
- **Vite:** For ultra-fast HMR and optimized production bundling.
- **Tailwind CSS v4:** For the modern, hardware-inspired Glassmorphism interface.
- **React-Use-Measure:** For responsive canvas scaling.

## 📥 Local Setup

```bash
# Clone the repository
git clone [https://github.com/YOUR_USERNAME/ascii-observer.git](https://github.com/YOUR_USERNAME/ascii-observer.git)

# Install dependencies
npm install

# Run the development server
npm run dev