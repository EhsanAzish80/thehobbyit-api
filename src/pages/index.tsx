// src/pages/index.tsx
import { useEffect, useRef, useState } from "react";
import type { NextPage } from "next";

// --- Assets (relative to this file) ---
import background from "./assets/background.png";
import background from "./assets/Sign.png";

import cloud1 from "./assets/cloud1.png";
import cloud2 from "./assets/cloud2.png";
import cloud3 from "./assets/cloud3.png";
import cloud4 from "./assets/cloud4.png";

import avatar1w1 from "./assets/avatar1w1.png";
import avatar1w2 from "./assets/avatar1w2.png";
import avatar1w3 from "./assets/avatar1w3.png";
import avatar1w4 from "./assets/avatar1w4.png";
import avatar1w5 from "./assets/avatar1w5.png";
import avatar1w6 from "./assets/avatar1w6.png";
import avatarStand from "./assets/avatar1.png";

import tree1 from "./assets/tree1.png";
import tree2 from "./assets/tree2.png";
import tree3 from "./assets/tree3.png";
import tree4 from "./assets/tree4.png";

const walkingFrames = [
  avatar1w1,
  avatar1w2,
  avatar1w3,
  avatar1w4,
  avatar1w5,
  avatar1w6,
];

type Cloud = { x: number; yPct: number; speed: number; img: any; wPct: number };
type Tree = { x: number; depth: "back" | "front"; img: any; wPct: number };

const Home: NextPage = () => {
  const sceneRef = useRef<HTMLDivElement | null>(null);

  // Measured scene size (avoids window usage at render)
  const [sceneW, setSceneW] = useState(0);
  const [sceneH, setSceneH] = useState(0);

  // Animation state
  const [frameIndex, setFrameIndex] = useState(0);
  const [avatarX, setAvatarX] = useState(0);

  // Clouds & trees initial state
  const [clouds, setClouds] = useState<Cloud[]>([
    { x: 80, yPct: 8, speed: 0.12, img: cloud1, wPct: 18 },
    { x: 300, yPct: 13, speed: 0.09, img: cloud2, wPct: 22 },
    { x: 560, yPct: 10, speed: 0.14, img: cloud3, wPct: 20 },
    { x: 820, yPct: 16, speed: 0.07, img: cloud4, wPct: 20 },
  ]);

  const [trees, setTrees] = useState<Tree[]>(() => {
    // distribute trees horizontally; widths are % of scene
    const imgs = [tree1, tree2, tree3, tree4];
    const arr: Tree[] = [];
    for (let i = 0; i < 8; i++) {
      arr.push({
        x: i * 240, // pixels; we’ll wrap based on scene width after measure
        depth: i % 2 === 0 ? "back" : "front",
        img: imgs[i % imgs.length],
        wPct: i % 2 === 0 ? 10 : 12, // front row slightly larger
      });
    }
    return arr;
  });

  // Measure container once mounted & on resize
  useEffect(() => {
    const measure = () => {
      if (!sceneRef.current) return;
      const rect = sceneRef.current.getBoundingClientRect();
      setSceneW(rect.width);
      setSceneH(rect.height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (sceneRef.current) ro.observe(sceneRef.current);
    return () => ro.disconnect();
  }, []);

  // Walk cycle (swap sprite frames)
  useEffect(() => {
    const id = setInterval(
      () => setFrameIndex((i) => (i + 1) % walkingFrames.length),
      140
    );
    return () => clearInterval(id);
  }, []);

  // Motion loop (cloud drift, parallax trees, avatar)
  useEffect(() => {
    if (!sceneW) return; // wait until measured

    const speedAvatar = Math.max(1.2, sceneW * 0.0016); // scale with width
    const raf = { id: 0 as number };

    const step = () => {
      // avatar
      setAvatarX((x) => {
        const nx = x + speedAvatar;
        return nx > sceneW + sceneW * 0.15 ? -sceneW * 0.15 : nx;
      });

      // clouds (wrap to the right when offscreen)
      setClouds((prev) =>
        prev.map((c) => {
          let newX = c.x - c.speed * Math.max(1, sceneW * 0.002);
          if (newX < -((c.wPct / 100) * sceneW)) newX = sceneW + 40;
          return { ...c, x: newX };
        })
      );

      // trees parallax (front moves more than back)
      // setTrees((prev) =>
      //   prev.map((t) => {
      //     const layerSpeed =
      //       (t.depth === "front" ? 0.9 : 0.5) * Math.max(1, sceneW * 0.002);
      //     let newX = t.x - layerSpeed;
      //     const wrapW = (t.wPct / 100) * sceneW + 80;
      //     if (newX < -wrapW) newX = sceneW + 40;
      //     return { ...t, x: newX };
      //   })
      // );

      raf.id = requestAnimationFrame(step);
    };

    raf.id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.id);
  }, [sceneW]);

  // Don’t render until we’ve measured (prevents NaN positions)
  const ready = sceneW > 0 && sceneH > 0;

  // Layout constants derived from scene size
  const avatarW = Math.min(sceneW * 0.14, 180); // responsive, capped
  // Road vertical band: place avatar between tree rows
  const roadY = sceneH * 0.72; // baseline for feet
  const backRowY = sceneH * 0.60;
  const frontRowY = sceneH * 0.76;

  return (
    <div
      ref={sceneRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#5ec4ff",
      }}
    >
      {/* Background */}
      <img
        src={(background as any).src ?? (background as unknown as string)}
        alt="bg"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      />

      {/* Clouds */}
      {ready &&
        clouds.map((c, i) => (
          <img
            key={`cloud-${i}`}
            src={(c.img as any).src ?? (c.img as unknown as string)}
            alt={`cloud-${i}`}
            style={{
              position: "absolute",
              left: `${c.x}px`,
              top: `${(c.yPct / 100) * sceneH}px`,
              width: `${c.wPct}vw`,
              pointerEvents: "none",
              zIndex: 1,
              opacity: 0.9,
            }}
          />
        ))}

      {/* BACK row trees */}
      {ready &&
        trees
          .filter((t) => t.depth === "back")
          .map((t, i) => (
            <img
              key={`tree-back-${i}`}
              src={(t.img as any).src ?? (t.img as unknown as string)}
              alt="tree back"
              style={{
                position: "absolute",
                left: `${t.x}px`,
                top: `${backRowY - (t.wPct / 100) * sceneW * 1.3}px`,
                width: `${t.wPct}vw`,
                zIndex: 2,
                filter: "brightness(0.95)",
              }}
            />
          ))}

      {/* Avatar (between rows, on the road) */}
      {ready && (
        <img
          src={
            ((walkingFrames[frameIndex] ?? avatarStand) as any).src ??
            ((walkingFrames[frameIndex] ?? avatarStand) as unknown as string)
          }
          alt="traveler"
          style={{
            position: "absolute",
            left: `${avatarX}px`,
            top: `${roadY}px`,
            width: `${avatarW}px`,
            zIndex: 3,
            imageRendering: "pixelated",
          }}
        />
      )}

      {/* FRONT row trees */}
      {ready &&
        trees
          .filter((t) => t.depth === "front")
          .map((t, i) => (
            <img
              key={`tree-front-${i}`}
              src={(t.img as any).src ?? (t.img as unknown as string)}
              alt="tree front"
              style={{
                position: "absolute",
                left: `${t.x}px`,
                top: `${frontRowY - (t.wPct / 100) * sceneW * 1.35}px`,
                width: `${t.wPct}vw`,
                zIndex: 4, // in front of avatar
                filter: "drop-shadow(0 6px 8px rgba(0,0,0,.25))",
              }}
            />
          ))}

      {/* Minimal title (optional) */}
      <img
        src={sign.src}
        alt="sign"
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "300px",
          filter: "drop-shadow(4px 4px 6px rgba(0,0,0,0.5))",
          zIndex: 10,
        }}
      />
      </div>
    </div>
  );
};

export default Home;
