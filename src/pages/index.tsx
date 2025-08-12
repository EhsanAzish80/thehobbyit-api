import { useEffect, useState } from "react";

// Asset imports
import background from "./assets/background.png";
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

const walkingFrames = [
  avatar1w1.src,
  avatar1w2.src,
  avatar1w3.src,
  avatar1w4.src,
  avatar1w5.src,
  avatar1w6.src,
];

export default function Home() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [cloudPositions, setCloudPositions] = useState<
    { x: number; y: number; speed: number; img: string }[]
  >([]);
  const [avatarX, setAvatarX] = useState(0);
  const [screenWidth, setScreenWidth] = useState(0);

  // Initialize positions after window is available
  useEffect(() => {
    if (typeof window !== "undefined") {
      setScreenWidth(window.innerWidth);
      setCloudPositions([
        { x: 50, y: 40, speed: 0.2, img: cloud1.src },
        { x: 200, y: 80, speed: 0.15, img: cloud2.src },
        { x: 350, y: 60, speed: 0.25, img: cloud3.src },
        { x: 500, y: 100, speed: 0.1, img: cloud4.src },
      ]);
    }
  }, []);

  // Walking animation
  useEffect(() => {
    const frameInterval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % walkingFrames.length);
    }, 150);
    return () => clearInterval(frameInterval);
  }, []);

  // Move avatar and clouds
  useEffect(() => {
    if (screenWidth === 0) return;

    const moveInterval = setInterval(() => {
      setAvatarX((prev) => prev + 2);

      setCloudPositions((prev) =>
        prev.map((cloud) => {
          let newX = cloud.x - cloud.speed;
          if (newX < -150) newX = screenWidth + 50;
          return { ...cloud, x: newX };
        })
      );
    }, 16);

    return () => clearInterval(moveInterval);
  }, [screenWidth]);

  return (
    <div
      style={{
        overflow: "hidden",
        width: "100vw",
        height: "100vh",
        position: "relative",
      }}
    >
      {/* Background */}
      <img
        src={background.src}
        alt="background"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
        }}
      />

      {/* Clouds */}
      {cloudPositions.map((cloud, i) => (
        <img
          key={i}
          src={cloud.img}
          alt={`cloud-${i}`}
          style={{
            position: "absolute",
            left: `${cloud.x}px`,
            top: `${cloud.y}px`,
            width: "150px",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Avatar */}
      {screenWidth > 0 && (
        <img
          src={walkingFrames[frameIndex]}
          alt="avatar"
          style={{
            position: "absolute",
            bottom: "150px",
            left: `${avatarX % screenWidth}px`,
            width: "280px",
          }}
        />
      )}
    </div>
  );
}
