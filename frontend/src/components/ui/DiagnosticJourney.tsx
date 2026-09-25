import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';

const nodes = [
  { id: '01', title: 'PRACTICE', path: '/topic', cx: 100, cy: 100, type: 'above' },
  { id: '02', title: 'LIBRARY', path: '/library', cx: 266, cy: 200, type: 'below' },
  { id: '03', title: 'EXAM MODE', path: '/exam', cx: 433, cy: 100, type: 'above' },
  { id: '04', title: 'KNOWLEDGE GAPS', path: '/knowledge-gaps', cx: 600, cy: 200, type: 'below' },
  { id: '05', title: 'DASHBOARD', path: '/dashboard', cx: 766, cy: 100, type: 'above' },
  { id: '06', title: 'REVISION', path: '/revision', cx: 933, cy: 200, type: 'below' },
  { id: '07', title: 'HISTORY', path: '/history', cx: 1100, cy: 100, type: 'above' },
];

const SplitAnimation = ({ node, onComplete }: { node: any, onComplete: () => void }) => {
  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, backgroundColor: "rgba(0,0,0,0)" }}
      animate={{ opacity: 1, backgroundColor: "rgba(23, 26, 53, 0.98)" }}
      transition={{ duration: 0.3 }}
    >
      {/* The revealing page (white rectangle) */}
      <motion.div
        className="absolute h-full bg-background shadow-2xl z-10"
        initial={{ width: 0 }}
        animate={{ width: "100vw" }}
        transition={{ delay: 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={onComplete}
      />
      
      {/* Left half */}
      <motion.div
        className="absolute z-20 flex items-center justify-center w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full bg-[#1D2042] border border-[#292D52] shadow-2xl"
        style={{ clipPath: 'inset(0 50% 0 0)' }}
        initial={{ scale: 0.4, x: 0 }}
        animate={{ scale: 1, x: "-50vw" }}
        transition={{ 
          scale: { duration: 0.5, ease: "easeOut" }, 
          x: { delay: 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] } 
        }}
      >
        <div className="text-white text-center flex flex-col items-center justify-center space-y-2">
           <Compass className="w-8 h-8 text-indigo-300 mx-auto" />
           <div className="text-2xl font-bold tracking-widest">{node.title}</div>
           <div className="text-xs text-indigo-300 font-medium tracking-wide">Navigating to section</div>
        </div>
      </motion.div>

      {/* Right half */}
      <motion.div
        className="absolute z-20 flex items-center justify-center w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full bg-[#1D2042] border border-[#292D52] shadow-2xl"
        style={{ clipPath: 'inset(0 0 0 50%)' }}
        initial={{ scale: 0.4, x: 0 }}
        animate={{ scale: 1, x: "50vw" }}
        transition={{ 
          scale: { duration: 0.5, ease: "easeOut" }, 
          x: { delay: 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] } 
        }}
      >
        <div className="text-white text-center flex flex-col items-center justify-center space-y-2">
           <Compass className="w-8 h-8 text-indigo-300 mx-auto" />
           <div className="text-2xl font-bold tracking-widest">{node.title}</div>
           <div className="text-xs text-indigo-300 font-medium tracking-wide">Navigating to section</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const DiagnosticJourney: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [expandingNode, setExpandingNode] = useState<any>(null);

  const handleNodeClick = (node: any) => {
    setExpandingNode(node);
  };

  const handleAnimationComplete = () => {
    if (expandingNode) {
      navigate(expandingNode.path);
    }
  };

  // Prevent scroll when animating
  useEffect(() => {
    if (expandingNode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [expandingNode]);

  return (
    <section 
      ref={containerRef} 
      className="py-12 sm:py-16 w-full flex flex-col justify-center items-center overflow-hidden bg-background relative min-h-[80vh]"
    >
      <div className="max-w-6xl mx-auto px-6 mb-12 text-center w-full">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-5xl font-serif text-primary mb-2 tracking-tight"
        >
          Misconception Mapper
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg sm:text-xl font-serif text-primary/80 italic"
        >
          Every wrong answer leaves a trail.
        </motion.p>
      </div>

      <div className="w-full px-4 sm:px-8 pb-12 overflow-hidden">
        <svg 
          viewBox="0 0 1200 300" 
          className="w-full h-auto drop-shadow-sm scale-110 sm:scale-100"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* The continuous curved path */}
          <motion.path
            d="M 0 150 C 30 150, 50 100, 100 100 C 183 100, 183 200, 266 200 C 349 200, 349 100, 433 100 C 516 100, 516 200, 600 200 C 683 200, 683 100, 766 100 C 849 100, 849 200, 933 200 C 1016 200, 1016 100, 1100 100 C 1150 100, 1170 150, 1200 150"
            stroke="currentColor"
            className="text-muted"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

          {/* The alternating nodes */}
          {nodes.map((node, index) => {
            const isAbove = node.type === 'above';
            const r = 85; // Much larger radius!
            const isBlue = index % 2 === 0;

            const textY = isAbove ? node.cy - 6 : node.cy - 6;
            const numY = textY - 16;
            const labelY = textY + 18;

            return (
              <motion.g 
                key={node.id} 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer group"
              >
                {/* The full circle */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={r}
                  className={`transition-all duration-300 ${
                    isBlue 
                      ? "fill-secondary stroke-secondary group-hover:brightness-125" 
                      : "fill-background stroke-muted group-hover:fill-slate-50 group-hover:stroke-secondary"
                  }`}
                  strokeWidth="1.5"
                />
                
                {/* Hover glow effect */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={r + 10}
                  fill="none"
                  stroke="currentColor"
                  className={`opacity-0 group-hover:opacity-20 transition-opacity duration-300 ${isBlue ? "text-secondary" : "text-secondary"}`}
                  strokeWidth="8"
                />
                
                {/* Inner Content */}
                <g className="text-center font-sans pointer-events-none">
                  <text
                    x={node.cx}
                    y={numY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-xl font-light transition-colors ${
                      isBlue ? "fill-accent/90 group-hover:fill-accent" : "fill-accent group-hover:fill-secondary/70"
                    }`}
                  >
                    {node.id}
                  </text>
                  
                  {/* Multi-line or single line text */}
                  {node.title.split(' ').map((word, wIdx) => (
                    <text
                      key={wIdx}
                      x={node.cx}
                      y={labelY + (wIdx * 16)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
                        isBlue ? "fill-background" : "fill-secondary group-hover:fill-secondary"
                      }`}
                    >
                      {word}
                    </text>
                  ))}
                </g>
                
                {/* Small connection dots on the main path */}
                <circle cx={node.cx} cy={isAbove ? node.cy + r : node.cy - r} r="3" className={`fill-background transition-colors ${isBlue ? "stroke-primary" : "stroke-muted group-hover:stroke-primary"}`} strokeWidth="1.5" />
              </motion.g>
            );
          })}
        </svg>
      </div>

      <AnimatePresence>
        {expandingNode && (
          <SplitAnimation 
            node={expandingNode} 
            onComplete={handleAnimationComplete} 
          />
        )}
      </AnimatePresence>
    </section>
  );
};
