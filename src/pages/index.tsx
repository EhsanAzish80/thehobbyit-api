import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";

// Asset imports (make sure these are in /public or imported directly)
import background from "./assets/background.png";
import cloud1 from "./assets/cloud1.png";
import cloud2 from "./assets/cloud2.png";
import cloud3 from "./assets/cloud3.png";
import cloud4 from "./assets/cloud4.png";

import avatar1w1 from "./assets/avatar1w1.png";
import avatar1w2 from "./assets/avatar1w2.png";
import avatar1w3 from "./assets/avatar1w3.png";
import avatar1w4 from "./assets/avatar1w4.png";
import avatar1 from "./assets/avatar1.png"; // standing
import avatar1w5 from "./assets/avatar1w5.png";
import avatar1w6 from "./assets/avatar1w6.png";

const walkingFrames = [
  avatar1w1,
  avatar1w2,
  avatar1w3,
  avatar1w4,
  avatar1w5,
  avatar1w6,
];

const App: React.FC = () => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [cloudPositions, setCloudPositions] = useState([
    { x: 50, y: 40, speed: 0.2, img: cloud1 },
    { x: 200, y: 80, speed: 0.15, img: cloud2 },
    { x: 350, y: 60, speed: 0.25, img: cloud3 },
    { x: 500, y: 100, speed: 0.1, img: cloud4 },
  ]);
  const [avatarX, setAvatarX] = useState(0);

  // Walking animation
  useEffect(() => {
    const frameInterval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % walkingFrames.length);
    }, 150); // change frame every 150ms
    return () => clearInterval(frameInterval);
  }, []);

  // Move avatar and clouds
  useEffect(() => {
    const moveInterval = setInterval(() => {
      // Move avatar
      setAvatarX((prev) => prev + 2); // speed in px

      // Move clouds and wrap around
      setCloudPositions((prev) =>
        prev.map((cloud) => {
          let newX = cloud.x - cloud.speed;
          if (newX < -150) newX = window.innerWidth + 50;
          return { ...cloud, x: newX };
        })
      );
    }, 16); // ~60fps

    return () => clearInterval(moveInterval);
  }, []);

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
        src={background}
        alt="background"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
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
      <img
        src={walkingFrames[frameIndex]}
        alt="avatar"
        style={{
          position: "absolute",
          bottom: "50px",
          left: `${avatarX % window.innerWidth}px`,
          width: "80px",
        }}
      />
    </div>
  );
};

// Render to root
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;
