"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

interface Technology {
  logo: string;
  name: string;
  role: string;
}

interface TechMarqueeProps {
  technologies: Technology[];
}

export function TechMarquee({ technologies }: TechMarqueeProps) {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const speedRef = useRef(0.08);
  const targetSpeedRef = useRef(0.08);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let frameId = 0;

    function animate(timestamp: number) {
      const element = marqueeRef.current;

      if (element) {
        const delta = lastFrameRef.current
          ? Math.min(timestamp - lastFrameRef.current, 32)
          : 16;
        const halfWidth = element.scrollWidth / 2;

        speedRef.current += (targetSpeedRef.current - speedRef.current) * 0.08;
        offsetRef.current =
          (offsetRef.current + speedRef.current * delta) % halfWidth;
        element.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }

      lastFrameRef.current = timestamp;
      frameId = requestAnimationFrame(animate);
    }

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div
      onMouseEnter={() => {
        targetSpeedRef.current = 0.02;
      }}
      onMouseLeave={() => {
        targetSpeedRef.current = 0.08;
      }}
    >
      <div className="flex w-max gap-4 px-5" ref={marqueeRef}>
        {[...technologies, ...technologies].map((technology, index) => (
          <div
            aria-hidden={index >= technologies.length}
            className="flex min-w-64 items-center gap-4 rounded-[1.5rem] border border-[#b9e2e1] bg-white p-4 shadow-sm"
            key={`${technology.name}-${index}`}
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#eef8f8] p-3">
              <Image
                alt={`Logo ${technology.name}`}
                className="size-full object-contain"
                height={40}
                src={technology.logo}
                width={40}
              />
            </div>
            <div>
              <p className="font-bold text-[#0d4a48]">{technology.name}</p>
              <p className="mt-1 text-[#4c7372] text-sm">{technology.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
