# Autonomous Drone Simulation
<img width="1430" alt="Screenshot 2025-06-09 at 11 41 58 in the morning" src="https://github.com/user-attachments/assets/a7bf79d8-280c-47ed-9fe6-3d6c9c8bdd7a" />


A sophisticated 3D drone simulation built with Next.js, Three.js, and React Three Fiber, featuring AI-powered autonomous flight capabilities using deep reinforcement learning.

![Drone Simulation Demo](public/droneSim.gif)

## 🚁 Features

### Core Simulation
- **Realistic 3D Drone Physics**: Full 6-DOF movement with realistic tilt, thrust, and inertia
- **Advanced Flight Controls**: Manual control with keyboard inputs for takeoff, landing, movement, and camera control
- **Dynamic Camera System**: Movable gimbal camera with tilt and rotation controls
- **Comprehensive Environment**: Buildings, skyscrapers, dense forests, and training obstacles

### AI & Machine Learning
- **Deep Reinforcement Learning**: Neural network-based autonomous flight using Q-learning
- **Imitation Learning**: Record and learn from human demonstrations
- **Advanced Reward System**: Shaped rewards for collision avoidance, mission completion, and flight efficiency
- **Real-time Training**: Live training with exploration/exploitation balance

### LiDAR & Sensing
- **Optimized LiDAR System**: 16 spherical rays providing 360° 3D obstacle detection
- **Real-time Visualization**: Visible ray casting with intersection markers
- **Performance Optimized**: Reduced from 52 to 16 rays for better simulation performance

### Mission System
- **Dynamic Mission Generation**: Randomized start and target positions
- **Landing Challenges**: Precision landing requirements within target zones
- **Progress Tracking**: Real-time distance and completion monitoring

### Training Environment
- **Configurable Difficulty**: Beginner, intermediate, and advanced training modes
- **Dynamic Obstacles**: Moving platforms, pendulums, and wind zones
- **Comprehensive Scenarios**: Gates, tunnels, narrow passages, and maze walls

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **3D Graphics**: Three.js, React Three Fiber
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **AI/ML**: Custom neural network implementation with reinforcement learning
- **Package Manager**: pnpm
<img width="1430" alt="Screenshot 2025-06-09 at 11 42 41 in the morning" src="https://github.com/user-attachments/assets/2aa3d2e2-0b14-4a1a-8948-eeb6da475456" />



## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm/yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd autonomous-drone
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎮 Controls

### Manual Flight Controls
- **Movement**: Arrow keys (↑↓←→)
- **Altitude**: Shift + ↑↓
- **Rotation**: Shift + ←→
- **Takeoff**: T
- **Landing**: L
- **Hover**: H
- **Camera**: I/K (tilt), J/O (rotate)

### AI Controls
- **Toggle AI Mode**: Switch between manual and autonomous control
- **Training**: Enable/disable real-time learning
- **Recording**: Record demonstrations for imitation learning
- **Save/Load**: Export and import trained models

## 🧠 AI Architecture

### Neural Network
- **Input Size**: 40 features
  - Position, velocity, rotation (9)
  - Drone status (4)
  - LiDAR readings (16)
  - LiDAR indicators (3)
  - Flight status (2)
  - Mission info (6)
- **Architecture**: 256→128→64 hidden layers
- **Output**: 9 possible actions (movement + hover)

### Training Features
- **Reinforcement Learning**: Q-learning with experience replay
- **Imitation Learning**: Learn from human demonstrations
- **Reward Shaping**: Complex reward system for optimal behavior
- **Auto-respawn**: Continuous training with automatic episode management

## 📊 Performance Optimizations

### LiDAR System
- **Reduced Ray Count**: Optimized from 52 to 16 spherical rays
- **68% Performance Improvement**: Significant reduction in computational overhead
- **Maintained Coverage**: Full 3D spatial awareness with spherical distribution

### Neural Network
- **Compact Architecture**: Reduced input size from 77 to 40 features
- **Efficient Training**: Smaller network for faster convergence
- **Real-time Inference**: Optimized for live decision making

## 🎯 Mission Types

- **Basic Navigation**: Fly from start to target position
- **Precision Landing**: Land within 3-meter target zones
- **Obstacle Avoidance**: Navigate through complex environments
- **Altitude Challenges**: Maintain optimal flight altitudes
- **Speed Optimization**: Complete missions efficiently

## 🔧 Configuration

### Training Parameters
- **Episode Length**: 3000 steps maximum
- **Learning Rate**: 0.0005
- **Exploration**: Epsilon-greedy with decay
- **Replay Buffer**: 100,000 experiences
- **Batch Size**: 32 samples

### Environment Settings
- **World Size**: 200m × 200m
- **LiDAR Range**: 25m maximum
- **Altitude Limits**: 0-100m
- **Mission Distance**: 15-60m

## 📈 Monitoring & Analytics

- **Real-time Metrics**: Episode rewards, collision counts, success rates
- **Training Progress**: Loss curves, exploration rates, performance trends
- **Flight Data**: Position tracking, LiDAR readings, action history
- **Model Management**: Save/load trained networks and demonstrations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Three.js community for excellent 3D graphics capabilities
- React Three Fiber for seamless React integration
- Reinforcement learning research community for algorithmic foundations
