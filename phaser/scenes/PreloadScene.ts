import Phaser from "phaser";

/**
 * Preload 场景:加载所有静态资源 + 进度条。
 * Day 1 只加载标题主视觉;Day 2+ 会在这里批量加载背景/立绘/物件。
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    const { width, height } = this.scale;
    const barW = width * 0.5;
    const barH = 6;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    this.add
      .text(width / 2, barY - 40, "加载中", {
        fontFamily: "serif",
        fontSize: "18px",
        color: "#666",
      })
      .setOrigin(0.5)
      .setLetterSpacing(6);

    const bar = this.add.graphics();
    this.load.on("progress", (v: number) => {
      bar.clear();
      bar.fillStyle(0xffffff, 0.7);
      bar.fillRect(barX, barY, barW * v, barH);
    });

    // 现有资源:标题主视觉(唯一的真 1920x1080 图)
    this.load.image("title-keyart", "/images/scenes/title_keyart.png");

    // Day 2+ 将加载:
    // - 3 张 16:9 场景背景(重新生成后)
    // - 6 张角色立绘(现有)
    // - 15 个物件 sprite(Day 10 生成后)
    // - 裂纹图案 atlas
  }

  create() {
    this.scene.start("TitleScene");
  }
}
