import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { TitleScene } from "./scenes/TitleScene";
import { PrologueScene } from "./scenes/PrologueScene";
import { GameScene } from "./scenes/GameScene";

/**
 * Phaser 游戏配置。
 * - 1920x1080 设计分辨率,Scale.FIT 自适应任意屏幕
 * - arcade physics(Day3 玩家移动用)
 * - scene 顺序即注册顺序,首个 scene(Boot)自动启动
 */
export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // 优先 WebGL,失败降级 canvas
  parent: "phaser-game",
  width: 1920,
  height: 1080,
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [BootScene, PreloadScene, TitleScene, PrologueScene, GameScene],
  // EndingScene 待 Day 9 加入
};
