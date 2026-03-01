# 🎵 Web Audio Visualizer

> Real-time audio frequency visualization with multiple modes, custom effects, and video export — built with Next.js and the Web Audio API.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=flat-square&logo=tailwindcss)

---

## ✨ Features

- **5 Visualization Modes** — Bars, Waveform, Reflective, Layered Wave, Circular
- **3 Color Schemes** — Sunset, Neon, Fire
- **Custom Background & Overlay Logo** — Upload images that react to the beat
- **Reactive Text Overlay** — Text that pulses and glows with the music
- **Video Export** — Render and download the visualization as MP4/WebM
- **Extension System** — Write custom JS to override spectrum, background, or text layers
- **Real-time Controls** — Frequency bands, sensitivity, glow, rotation speed, and more

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm (recommended)

### Installation

```bash
# Clone the repo
git clone https://github.com/zijipia/web-audio-visualizer.git
cd web-audio-visualizer

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎛️ How to Use

1. **Upload an MP3** — click the file upload area or drag & drop
2. **Pick a visualization mode** — Bars, Waveform, Reflective, Layered Wave, or Circular
3. **Customize** — adjust frequency bands, colors, sensitivity, glow, and more via the settings panel
4. **Add visuals** — upload a background image and/or overlay logo
5. **Export** — click **Render Full** to record the full visualization, then **Download** the video file

---

## 🧩 Extension API

Write custom JavaScript to override any visual layer. Access audio data via the `context` object:

| Property | Description |
|---|---|
| `context.ctx` | Canvas 2D rendering context |
| `context.width` / `context.height` | Canvas dimensions |
| `context.frequencyData` | `Uint8Array` of frequency amplitudes |
| `context.timeData` | `Uint8Array` of time-domain (waveform) data |
| `context.bassIntensity` | Low-frequency energy (0–1) |
| `context.backgroundReact` | Background reactivity value |
| `context.textReact` | Text reactivity value |

Example presets and community extensions: [GitHub Discussions](https://github.com/zijipia/web-audio-visualizer/discussions/categories/extensions)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Components | Radix UI + shadcn/ui |
| Audio | Web Audio API |
| Video | MediaRecorder API |
| Icons | Lucide React |

---

## 📁 Project Structure

```
├── app/
│   ├── layout.tsx        # Root layout & metadata
│   └── page.tsx          # Entry point
├── components/
│   ├── audio-visualizer.tsx      # Main orchestrator
│   ├── visualization-canvas.tsx  # Canvas rendering engine
│   ├── playback-controls.tsx     # Controls & settings panel
│   ├── file-upload.tsx           # Audio & image upload
│   └── video-export.tsx          # Video render & download
└── hooks/
    └── use-audio-context.ts      # Web Audio API hook
```

---

## 👥 Credits

| Role | Contributor |
|---|---|
| 🧑‍💻 Project Lead & Development | [Ziji](https://github.com/zijipia) |
| 🤖 AI Assistance & Code Generation | [Claude](https://claude.ai) (Anthropic) |
| 🤖 AI Assistance & Code Generation | [ChatGPT](https://chatgpt.com) (OpenAI) |
| 🎨 UI Prototyping & Design | [v0.dev](https://v0.dev) (Vercel) |

---

## 📄 License

MIT © [Ziji](https://github.com/zijipia)
