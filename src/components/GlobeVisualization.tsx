import { useRef } from 'react';

const GlobeVisualization = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="h-[300px] w-[300px] flex items-center justify-center print:h-[400px] print:w-[400px]">
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg"
        alt="Planeta Terra"
        className="w-full h-full object-cover rounded-full shadow-lg"
        style={{ maxWidth: 300, maxHeight: 300, border: 'none', background: 'none' }}
      />
    </div>
  );
};

export default GlobeVisualization;
