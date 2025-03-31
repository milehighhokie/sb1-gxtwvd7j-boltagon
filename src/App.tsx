import React, { useEffect, useRef, useState } from 'react';
import { Notebook as Robot, Zap } from 'lucide-react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ player: 0, robots: [0, 0, 0, 0, 0] });
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Game state
  const gameState = useRef({
    paddleHeight: 80,
    paddleWidth: 10,
    ballSize: 8,
    playerX: 400,
    playerY: 500,
    initialRobotPositions: [
      { x: 700, y: 300, velocity: 16 },    // Aggressive robot - Right side
      { x: 600, y: 100, velocity: 15 },    // Predictive robot - Top Right side
      { x: 400, y: 100, velocity: 24 },    // Stealth robot - Top side
      { x: 200, y: 100, velocity: 18 },    // Chaotic robot - Top Left side
      { x: 100, y: 300, velocity: 15.5 },  // Balanced robot - Left side
    ],
    robotPositions: [
      { x: 700, y: 300, velocity: 16 },    // Aggressive robot - Right side
      { x: 600, y: 100, velocity: 15 },    // Predictive robot - Top Right side
      { x: 400, y: 100, velocity: 24 },    // Stealth robot - Top side
      { x: 200, y: 100, velocity: 18 },    // Chaotic robot - Top Left side
      { x: 100, y: 300, velocity: 15.5 },  // Balanced robot - Left side
    ],
    // Each player guards one specific side of the hexagon
    playerAngle: Math.PI / 2, // Bottom side
    robotAngles: [
      0,              // Right side
      Math.PI / 3,    // Top Right side
      Math.PI / 2,    // Top side
      (2 * Math.PI) / 3, // Top Left side
      Math.PI,        // Left side
    ],
    robotBehaviors: [
      { type: 'aggressive', anticipationTime: 0 },     // Follows ball directly
      { type: 'predictive', anticipationTime: 30 },    // Predicts ball position
      { type: 'Stealth', anticipationTime: 0 },     // Stays centered, only moves when ball is close
      { type: 'chaotic', anticipationTime: 5 },        // Random movements with ball tracking
      { type: 'balanced', anticipationTime: 15 },      // Mix of prediction and reaction
    ],
    ballX: 400,
    ballY: 300,
    ballSpeedX: 4,
    ballSpeedY: 4,
    hexagonPoints: [] as { x: number; y: number }[],
    time: 0,
    lastTouched: -1, // -1 for player, 0-4 for robots
    lastScored: -1, // -1 for no score yet, 0-5 for player (5) or robots (0-4)
  });

  // Calculate hexagon points
  useEffect(() => {
    const centerX = 400;
    const centerY = 300;
    const radius = 250;
    const points = [];
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      points.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }
    
    gameState.current.hexagonPoints = points;
  }, []);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // Handle mouse/touch movement
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e 
        ? e.touches[0].clientX - rect.left
        : e.clientX - rect.left;
      
      // Calculate angle from center to mouse position
      const centerX = 400;
      const centerY = 300;
      const dx = x - centerX;
      const radius = 240;
      
      // Player is constrained to bottom side only
      const baseAngle = Math.PI / 2; // Bottom side center
      const maxDeviation = Math.PI / 6; // 30 degrees each way
      
      // Calculate angle but constrain it to the bottom side
      let angle = Math.atan2(200, dx);
      angle = Math.max(baseAngle - maxDeviation, Math.min(baseAngle + maxDeviation, angle));
      
      gameState.current.playerX = centerX + radius * Math.cos(angle);
      gameState.current.playerY = centerY + radius * Math.sin(angle);
      gameState.current.playerAngle = angle;
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove);

    const predictBallPosition = (time: number) => {
      const state = gameState.current;
      return {
        x: state.ballX + state.ballSpeedX * time,
        y: state.ballY + state.ballSpeedY * time,
      };
    };

    const updateRobotPosition = (index: number) => {
      const state = gameState.current;
      const robot = state.robotPositions[index];
      const behavior = state.robotBehaviors[index];
      const robotAngle = state.robotAngles[index];
      const center = { x: 400, y: 300 };
      const radius = 240;

      // Each robot is assigned to one side of the hexagon
      const baseAngle = robotAngle;
      const maxDeviation = Math.PI / 6; // 30 degrees each way

      let targetAngle = baseAngle;
      const predictedBall = predictBallPosition(behavior.anticipationTime);
      const ballAngle = Math.atan2(predictedBall.y - center.y, predictedBall.x - center.x);
      
      // Only react to the ball if it's approaching the robot's side
      let angleDiff = Math.abs(((ballAngle - baseAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
      if (angleDiff < Math.PI / 3) {
        switch (behavior.type) {
          case 'aggressive':
            // Directly follows the ball within its side
            targetAngle = Math.max(baseAngle - maxDeviation, 
                         Math.min(baseAngle + maxDeviation, ballAngle));
            break;
            
          case 'predictive':
            // Predicts and moves to where the ball will be
            const futureBall = predictBallPosition(behavior.anticipationTime);
            const futureAngle = Math.atan2(futureBall.y - center.y, futureBall.x - center.x);
            targetAngle = Math.max(baseAngle - maxDeviation,
                         Math.min(baseAngle + maxDeviation, futureAngle));
            break;
            
          case 'Stealth':
            // Stays centered unless ball is close
            const distance = Math.sqrt(
              Math.pow(state.ballX - robot.x, 2) + 
              Math.pow(state.ballY - robot.y, 2)
            );
            if (distance < 150) {
              targetAngle = Math.max(baseAngle - maxDeviation,
                           Math.min(baseAngle + maxDeviation, ballAngle));
            } else {
              targetAngle = baseAngle; // Return to center of side
            }
            break;
            
          case 'chaotic':
            // Random movement within its side
            if (Math.random() < 0.1) {
              targetAngle = baseAngle + (Math.random() - 0.5) * maxDeviation * 2;
            } else {
              targetAngle = Math.max(baseAngle - maxDeviation,
                           Math.min(baseAngle + maxDeviation, ballAngle));
            }
            break;
            
          case 'balanced':
            // Mix of prediction and current position
            const currentWeight = 0.3;
            const predictWeight = 0.7;
            const weightedAngle = ballAngle * predictWeight + baseAngle * currentWeight;
            targetAngle = Math.max(baseAngle - maxDeviation,
                         Math.min(baseAngle + maxDeviation, weightedAngle));
            break;
        }
      } else {
        // Return to center of side when ball is far
        targetAngle = baseAngle;
      }

      // Move robot with its unique velocity
      const currentAngle = Math.atan2(robot.y - center.y, robot.x - center.x);
      //let angleDiff = targetAngle - currentAngle;

      // Normalize to [-PI, PI]
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      
      const maxTurn = robot.velocity / radius;
      const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), maxTurn);
      
      robot.x = center.x + radius * Math.cos(newAngle);
      robot.y = center.y + radius * Math.sin(newAngle);
    };

    const checkGameOver = (newScore: { player: number; robots: number[] }) => {
      if (newScore.player >= 15) {
        setGameOver(true);
        return true;
      }
      const maxRobotScore = Math.max(...newScore.robots);
      if (maxRobotScore >= 15) {
        setGameOver(true);
        return true;
      }
      return false;
    };

    const drawBoltLogo = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      const size = 200;
      ctx.save();
      
      // Draw bolt shape
      ctx.beginPath();
      ctx.moveTo(x, y - size/2);
      ctx.lineTo(x + size/3, y);
      ctx.lineTo(x - size/4, y + size/4);
      ctx.lineTo(x, y + size/2);
      ctx.lineTo(x - size/3, y);
      ctx.lineTo(x + size/4, y - size/4);
      ctx.closePath();
      
      // Create gradient
      const gradient = ctx.createLinearGradient(x - size/2, y - size/2, x + size/2, y + size/2);
      gradient.addColorStop(0, '#4B9EF4');   // Light blue
      gradient.addColorStop(1, '#2C5EA5');   // Darker blue
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add subtle glow effect
      ctx.shadowColor = '#4B9EF4';
      ctx.shadowBlur = 15;
      ctx.fill();
      
      ctx.restore();
    };

    const updateGame = () => {
      const state = gameState.current;
      state.time++;
      
      // Move ball
      state.ballX += state.ballSpeedX;
      state.ballY += state.ballSpeedY;

      // Check collision with hexagon walls
      const center = { x: 400, y: 300 };
      const distance = Math.sqrt(
        Math.pow(state.ballX - center.x, 2) + 
        Math.pow(state.ballY - center.y, 2)
      );

      if (distance > 240) {
        // Calculate which side was scored against
        const ballAngle = Math.atan2(state.ballY - center.y, state.ballX - center.x);
        let scoredAgainst = -1;

        // Check if ball went out near player's side
        if (Math.abs(ballAngle - Math.PI / 2) < Math.PI / 6) {
          scoredAgainst = 5; // Player
        } else {
          // Check which robot's side was scored against
          state.robotAngles.forEach((angle, index) => {
            if (Math.abs(ballAngle - angle) < Math.PI / 6) {
              scoredAgainst = index;
            }
          });
        }

        // Update scores
        let newScore;
        if (state.lastTouched === -1) {
          newScore = {
            ...score,
            player: score.player + 1
          };
        } else {
          const newRobotScores = [...score.robots];
          newRobotScores[state.lastTouched]++;
          newScore = {
            ...score,
            robots: newRobotScores
          };
        }

        setScore(newScore);
        const isGameOver = checkGameOver(newScore);
        
        if (!isGameOver) {
          state.lastScored = scoredAgainst;
          resetBall();
        }
        return;
      }

      // Update each robot independently
      state.robotPositions.forEach((_, index) => {
        updateRobotPosition(index);
      });

      // Paddle collisions
      state.robotPositions.forEach((robot, index) => {
        const dx = state.ballX - robot.x;
        const dy = state.ballY - robot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < state.paddleHeight / 2 + state.ballSize) {
          const angle = Math.atan2(dy, dx);
          state.ballSpeedX = 6 * Math.cos(angle);
          state.ballSpeedY = 6 * Math.sin(angle);
          state.lastTouched = index;
        }
      });

      // Player paddle collision
      const playerDx = state.ballX - state.playerX;
      const playerDy = state.ballY - state.playerY;
      const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
      
      if (playerDistance < state.paddleHeight / 2 + state.ballSize) {
        const angle = Math.atan2(playerDy, playerDx);
        state.ballSpeedX = 6 * Math.cos(angle);
        state.ballSpeedY = 6 * Math.sin(angle);
        state.lastTouched = -1;
      }

      // Draw game
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, 800, 600);

      // Draw hexagon
      ctx.beginPath();
      ctx.moveTo(state.hexagonPoints[0].x, state.hexagonPoints[0].y);
      state.hexagonPoints.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Bolt logo in center
      drawBoltLogo(ctx, center.x, center.y);

      // Draw robots with different colors based on their behavior
      state.robotPositions.forEach((robot, index) => {
        const behavior = state.robotBehaviors[index];
        let robotColor;
        switch (behavior.type) {
          case 'aggressive': robotColor = '#ff4444'; break;
          case 'predictive': robotColor = '#44ff44'; break;
          case 'Stealth': robotColor = '#000044'; break;
          case 'chaotic': robotColor = '#ff44ff'; break;
          case 'balanced': robotColor = '#ffff44'; break;
          default: robotColor = '#ff4444';
        }
        
        ctx.fillStyle = robotColor;
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, state.paddleWidth, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw player
      ctx.fillStyle = '#4444ff';
      ctx.beginPath();
      ctx.arc(state.playerX, state.playerY, state.paddleWidth, 0, Math.PI * 2);
      ctx.fill();

      // Draw ball
      ctx.beginPath();
      ctx.arc(state.ballX, state.ballY, state.ballSize, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      if (!gameOver) {
        animationFrameId = requestAnimationFrame(updateGame);
      }
    };

    const resetBall = () => {
      const state = gameState.current;
      const center = { x: 400, y: 300 };
      const radius = 240;

      // Reset robot positions to their initial positions
      state.robotPositions.forEach((robot, index) => {
        const initialPos = state.initialRobotPositions[index];
        robot.x = initialPos.x;
        robot.y = initialPos.y;
      });

      // If no one was scored against (first serve), start from center
      if (state.lastScored === -1) {
        state.ballX = center.x;
        state.ballY = center.y;
        const angle = Math.random() * Math.PI * 2;
        state.ballSpeedX = 4 * Math.cos(angle);
        state.ballSpeedY = 4 * Math.sin(angle);
      } else {
        // Start from the side that was scored against
        let startAngle;
        if (state.lastScored === 5) { // Player
          startAngle = Math.PI / 2;
        } else {
          startAngle = state.robotAngles[state.lastScored];
        }

        // Position ball on the scored-against side
        state.ballX = center.x + radius * 0.9 * Math.cos(startAngle);
        state.ballY = center.y + radius * 0.9 * Math.sin(startAngle);

        // Set velocity towards center with slight randomization
        const towardsCenterAngle = startAngle + Math.PI + (Math.random() - 0.5) * Math.PI / 3;
        state.ballSpeedX = 4 * Math.cos(towardsCenterAngle);
        state.ballSpeedY = 4 * Math.sin(towardsCenterAngle);
      }

      state.lastTouched = -1;
    };

    animationFrameId = requestAnimationFrame(updateGame);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
    };
  }, [gameStarted, gameOver, score]);

  const resetGame = () => {
    setScore({ player: 0, robots: [0, 0, 0, 0, 0] });
    setGameOver(false);
    setGameStarted(false);
    gameState.current = {
      ...gameState.current,
      playerX: 400,
      playerY: 500,
      ballX: 400,
      ballY: 300,
      ballSpeedX: 4,
      ballSpeedY: 4,
      time: 0,
      lastTouched: -1,
      lastScored: -1,
      robotPositions: gameState.current.initialRobotPositions.map(pos => ({ ...pos }))
    };
  };

  const getWinningRobot = () => {
    const maxScore = Math.max(...score.robots);
    const winningIndex = score.robots.findIndex(s => s === maxScore);
    const robotTypes = ['Aggressive', 'Predictive', 'Stealth', 'Chaotic', 'Balanced'];
    return robotTypes[winningIndex];
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      {!gameStarted ? (
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">Welcome to the Boltagon! Pong vs 5 Unique Robots</h1>
          <div className="text-gray-400 mb-8 space-y-2">
            <p>First to 15 points wins! Move your mouse to guard your side of the hexagon!</p>
            <p className="text-sm">Score points by making your opponents miss the ball!</p>
            <p className="text-sm">
              Face off against:
              <span className="text-red-400 ml-2">Aggressive</span>,
              <span className="text-green-400 ml-2">Predictive</span>,
              <span className="text-blue-400 ml-2">Stealth</span>,
              <span className="text-pink-400 ml-2">Chaotic</span>, and
              <span className="text-yellow-400 ml-2">Balanced</span> robots!
            </p>
          </div>
          <button
            onClick={() => setGameStarted(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto"
          >
            <Robot size={24} />
            Start Game
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 text-2xl font-bold text-white flex gap-4">
            <span className="text-blue-400">You: {score.player}</span>
            {score.robots.map((robotScore, index) => {
              const colors = ['text-red-400', 'text-green-400', 'text-blue-400', 'text-pink-400', 'text-yellow-400'];
              return (
                <span key={index} className={colors[index]}>
                  Robot {index + 1}: {robotScore}
                </span>
              );
            })}
          </div>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="bg-gray-800 rounded-lg shadow-xl cursor-none"
          />
          {gameOver && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-gray-800 p-8 rounded-lg text-center">
                <h2 className="text-3xl font-bold text-white mb-4">
                  {score.player >= 15 ? 'You Win!' : `${getWinningRobot()} Robot Wins!`}
                </h2>
                <p className="text-gray-400 mb-6">
                  Final Score - You: {score.player} | Robots: {score.robots.join(', ')}
                </p>
                <button
                  onClick={resetGame}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
          {!gameOver && (
            <p className="mt-4 text-gray-400 text-sm">
              Move your mouse left and right to guard your side of the hexagon
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default App;