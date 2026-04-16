import { useEffect, useRef, useState, useCallback } from 'react';
import useMeasure from 'react-use-measure';

interface ProjectState {
  density: number;
  vision: 'raw' | 'phosphor' | 'chroma' | 'glitch' | 'nebula';
  focused: boolean;
  power: boolean;
  echo: boolean;
}

const GLYPHS = "@#*+=-:. ";
const ECHO_GLYPH = "█"; 

export default function App() {
  const vRef = useRef<HTMLVideoElement>(null);
  const pRef = useRef<HTMLCanvasElement>(null);
  const dRef = useRef<HTMLCanvasElement>(null);
  const prevFrame = useRef<Uint8ClampedArray | null>(null);
  const lastFrameTime = useRef<number>(0); 
  const [mRef, bounds] = useMeasure();
  
  const [state, setState] = useState<ProjectState>({
    density: 120, 
    vision: 'chroma',
    focused: false,
    power: false,
    echo: false
  });

  // Camera Management
  useEffect(() => {
    let s: MediaStream | null = null;
    if (state.power) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(ms => { s = ms; if (vRef.current) vRef.current.srcObject = ms; })
        .catch(console.error);
    } else {
      if (vRef.current?.srcObject) {
        (vRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        vRef.current.srcObject = null;
      }
      prevFrame.current = null;
    }
    return () => { s?.getTracks().forEach(t => t.stop()); };
  }, [state.power]);

  // Main Neural Rendering Loop (Stabilized 30 FPS)
  useEffect(() => {
    let id: number;
    const fpsLimit = 1000 / 30; 

    const process = (timestamp: number) => {
      id = requestAnimationFrame(process);

      const elapsed = timestamp - lastFrameTime.current;
      if (elapsed < fpsLimit) return;
      lastFrameTime.current = timestamp;

      const v = vRef.current;
      const p = pRef.current;
      const d = dRef.current;
      if (!v || !p || !d || !state.power || v.readyState < 2) return;

      const pCtx = p.getContext('2d', { willReadFrequently: true });
      const dCtx = d.getContext('2d');
      if (!pCtx || !dCtx) return;

      const { density, vision, echo } = state;
      const w = density;
      const h = Math.floor(v.videoHeight / (v.videoWidth / w) * 0.5);
      
      p.width = w; 
      p.height = h;

      const size = Math.max(4, Math.min(bounds.width / w * 1.6, bounds.height / h));
      d.width = w * (size * 0.6);
      d.height = h * size;

      pCtx.drawImage(v, 0, 0, w, h);
      const px = pCtx.getImageData(0, 0, w, h).data;
      const curLum = new Uint8ClampedArray(w * h);

      dCtx.fillStyle = '#050505'; 
      dCtx.fillRect(0, 0, d.width, d.height);
      dCtx.font = `900 ${size}px "JetBrains Mono", monospace`;

      const prev = prevFrame.current;
      const glyphLen = GLYPHS.length - 1;

      for (let y = 0; y < h; y++) {
        const rowOffset = y * w;
        for (let x = 0; x < w; x++) {
          const i = (rowOffset + x) * 4;
          let r = px[i], g = px[i+1], b = px[i+2];
          const lum = (0.21 * r + 0.72 * g + 0.07 * b);
          curLum[rowOffset + x] = lum;

          // CRITICAL FIX: Explicitly reset alpha per-pixel to allow toggle to work
          dCtx.globalAlpha = 1.0;

          // Vision Modes logic
          if (vision === 'raw') dCtx.fillStyle = `rgb(${r},${g},${b})`;
          else if (vision === 'chroma') {
            const boost = 1.6; 
            dCtx.fillStyle = `rgb(${Math.min(255, r + (r - lum) * boost)},${Math.min(255, g + (g - lum) * boost)},${Math.min(255, b + (b - lum) * boost)})`;
          } else if (vision === 'phosphor') dCtx.fillStyle = `rgb(0,${g},0)`;
          else if (vision === 'glitch') dCtx.fillStyle = `rgb(${r},${g*0.1},255)`;
          else if (vision === 'nebula') dCtx.fillStyle = `hsl(${y + 280}, 100%, 70%)`;
          
          let char = GLYPHS[Math.floor((lum/255) * glyphLen)];

          // Ghost Echo (Motion Detection)
          if (echo && prev) {
            const delta = Math.abs(lum - prev[rowOffset + x]);
            if (delta > 35) {
                dCtx.fillStyle = (vision === 'phosphor' || vision === 'raw') ? '#fff' : '#00ffff';
                char = ECHO_GLYPH;
            } else {
                dCtx.globalAlpha = 0.25;
            }
          }

          dCtx.fillText(char, x * (size * 0.6), y * size);
        }
      }
      prevFrame.current = curLum;
    };

    id = requestAnimationFrame(process);
    return () => cancelAnimationFrame(id);
  }, [state, bounds]);

  const save = useCallback(() => {
    const d = dRef.current;
    if (!d) return;
    const link = document.createElement('a');
    link.download = `OBSERVER_LOG_${Date.now()}.png`;
    link.href = d.toDataURL('image/png');
    link.click();
  }, []);

  return (
    <div className="relative h-screen w-full bg-[#030303] text-zinc-400 font-mono overflow-hidden">
      
      <div className="absolute inset-0 z-20 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,2px_100%]" />

      <main ref={mRef} className="absolute inset-0 z-10 flex items-center justify-center p-4">
        {!state.power ? (
          <div className="text-center group cursor-pointer" onClick={() => setState({...state, power: true})}>
            <div className="text-[10px] tracking-[1.5em] text-zinc-800 group-hover:text-indigo-500 transition-all duration-700">SymbolicEye</div>
            <div className="mt-4 w-6 h-px bg-zinc-900 mx-auto group-hover:w-32 group-hover:bg-indigo-500 transition-all duration-1000"></div>
          </div>
        ) : (
          <canvas ref={dRef} className="rounded-sm brightness-110 contrast-125 shadow-2xl" />
        )}
        <canvas ref={pRef} className="hidden" />
        <video ref={vRef} autoPlay playsInline className="hidden" />
      </main>

      {/* MOBILE-STABILIZED HUD */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-fit transition-all duration-700 ${state.focused ? 'bottom-[-150px] opacity-0' : 'opacity-100'}`}>
        <div className="flex flex-col gap-4 items-center">
            
            <div className="hidden sm:flex px-5 py-1.5 rounded-full bg-black/50 border border-white/5 backdrop-blur-xl items-center gap-4">
                <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Pixel_Grid</span>
                <input 
                  type="range" min="80" max="150" value={state.density} 
                  onChange={e => setState({...state, density: +e.target.value})}
                  className="w-24 h-0.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
                />
                <span className="text-[8px] font-bold text-zinc-400">{state.density}</span>
            </div>

            <div className="flex items-center gap-4 sm:gap-8 px-6 sm:px-10 py-3 sm:py-4 rounded-3xl bg-[#08080a]/95 border border-white/5 backdrop-blur-3xl shadow-2xl">
              
              <div className="flex items-center gap-4 sm:gap-6 pr-4 sm:pr-8 border-r border-white/5 flex-shrink-0">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white italic tracking-tighter">OBSERVER</span>
                    <span className="text-[6px] text-indigo-500 font-bold tracking-[0.4em]">STABLE</span>
                </div>
                <button 
                  onClick={() => setState({...state, power: !state.power})}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${state.power ? 'bg-red-500/10' : 'bg-white'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${state.power ? 'bg-red-500 animate-pulse' : 'bg-black'}`} />
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[100px] sm:max-w-none">
                {(['raw', 'chroma', 'phosphor', 'glitch', 'nebula'] as const).map(v => (
                  <button 
                    key={v} onClick={() => setState({...state, vision: v})}
                    className={`text-[8px] font-black uppercase tracking-tighter transition-all px-2 py-1 rounded flex-shrink-0 ${state.vision === v ? 'text-white bg-white/5' : 'text-zinc-600'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 sm:gap-6 pl-4 sm:pl-8 border-l border-white/5 flex-shrink-0">
                <button 
                  onClick={() => setState({...state, echo: !state.echo})}
                  className={`flex items-center gap-2 text-[8px] font-black transition-all ${state.echo ? 'text-cyan-400' : 'text-zinc-600'}`}
                >
                  GHOST_ECHO
                  <div className={`w-2 h-0.5 rounded-full transition-all duration-300 ${state.echo ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-zinc-800'}`} />
                </button>
                
                <div className="flex items-center gap-3 sm:gap-4 border-l border-white/5 pl-4 sm:pl-8">
                    <button onClick={save} className="text-zinc-600 hover:text-white transition-colors">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M208,56H181.33L165.33,34.67A8,8,0,0,0,159,32H97a8,8,0,0,0-6.33,2.67L74.67,56H48A16,16,0,0,0,32,72V200a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V72A16,16,0,0,0,208,56Zm-80,128a36,36,0,1,1,36-36A36,36,0,0,1,128,184Z"></path></svg>
                    </button>
                    <button onClick={() => setState({...state, focused: true})} className="text-zinc-600 hover:text-white transition-colors">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm112-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,200,160ZM48,96a8,8,0,0,0,8-8V56H88a8,8,0,0,0,0-16H48a8,8,0,0,0-8,8V88A8,8,0,0,0,48,96Z"></path></svg>
                    </button>
                </div>
              </div>

            </div>
        </div>
      </div>

      {state.focused && (
        <button 
          onClick={() => setState({...state, focused: false})}
          className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-2 border border-white/5 bg-black/40 backdrop-blur-md text-white text-[8px] font-black rounded-full hover:bg-white hover:text-black transition-all duration-500 tracking-[0.3em]"
        >
          RESTORE_HUD
        </button>
      )}

    </div>
  );
}