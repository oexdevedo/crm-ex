"use client";

import { useEffect, useRef } from "react";

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track mouse position with smooth easing
    const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    // Create stars
    const starCount = 150;
    const stars: Array<{
      x: number;
      y: number;
      z: number;
      size: number;
      color: string;
      speed: number;
    }> = [];

    const colors = ["#ffffff", "#e0f2fe", "#f0f9ff", "#bae6fd", "#c084fc", "#f472b6"];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        size: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 0.5 + 0.2,
      });
    }

    // Animation Loop
    const draw = () => {
      // Smoothly ease mouse coordinates
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Clear canvas frame for transparency
      ctx.clearRect(0, 0, width, height);

      // Draw a dark overlay for text contrast and blending
      ctx.fillStyle = "rgba(3, 0, 20, 0.45)";
      ctx.fillRect(0, 0, width, height);

      // Render cosmic nebulas (glowing radial gradients)
      const gradient1 = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        10,
        mouse.x,
        mouse.y,
        width * 0.6
      );
      gradient1.addColorStop(0, "rgba(99, 102, 241, 0.12)"); // indigo
      gradient1.addColorStop(0.5, "rgba(168, 85, 247, 0.04)"); // purple
      gradient1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, width, height);

      const gradient2 = ctx.createRadialGradient(
        width - mouse.x,
        height - mouse.y,
        50,
        width - mouse.x,
        height - mouse.y,
        width * 0.4
      );
      gradient2.addColorStop(0, "rgba(217, 70, 239, 0.08)"); // fuchsia
      gradient2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);

      // Draw and update stars
      for (let i = 0; i < starCount; i++) {
        const star = stars[i];

        // 3D perspective warp
        star.z -= star.speed;

        // Reset star when it passes the screen depth
        if (star.z <= 0) {
          star.z = width;
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
        }

        // Project 3D coordinates to 2D screen coordinates
        const k = 128 / star.z;
        const px = star.x * k + width / 2;
        const py = star.y * k + height / 2;

        // Slight shift based on mouse position (parallax)
        const shiftX = ((mouse.x - width / 2) / (width / 2)) * (star.z * -0.05);
        const shiftY = ((mouse.y - height / 2) / (height / 2)) * (star.z * -0.05);

        const finalX = px + shiftX;
        const finalY = py + shiftY;

        // Only draw if within viewport bounds
        if (finalX >= 0 && finalX <= width && finalY >= 0 && finalY <= height) {
          const size = (1 - star.z / width) * 5 * star.size;
          ctx.beginPath();
          ctx.arc(finalX, finalY, size, 0, Math.PI * 2);
          ctx.fillStyle = star.color;
          // Add a subtle glow to brighter stars
          if (size > 2.5) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = star.color;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0; // Reset shadow for next frame
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full block bg-[url('/login-bg.jpg')] bg-cover bg-center"
    />
  );
}
