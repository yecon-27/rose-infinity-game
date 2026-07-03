import Phaser from "phaser";

/**
 * GameScene 占位:Day 3 会替换为完整的横版探索玩法。
 * 现在只显示当前幕名 + 提示,验证场景流转链路。
 */
export class GameScene extends Phaser.Scene {
  private sceneId = "act1_aa";

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { sceneId?: string }) {
    this.sceneId = data.sceneId ?? "act1_aa";
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0a);

    this.add
      .text(width / 2, height / 2 - 40, `GameScene · ${this.sceneId}`, {
        fontFamily: "serif",
        fontSize: "28px",
        color: "#9a9a90",
      })
      .setOrigin(0.5)
      .setLetterSpacing(4);

    this.add
      .text(
        width / 2,
        height / 2 + 30,
        "Day 3 将实现:横版场景 + 阿沉移动 + 物件检视 + 过滤器裂纹",
        {
          fontFamily: "serif",
          fontSize: "14px",
          color: "#5a5a50",
        }
      )
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 60, "Esc 返回标题", {
        fontFamily: "serif",
        fontSize: "12px",
        color: "#3a3a35",
      })
      .setOrigin(0.5)
      .setLetterSpacing(4);

    this.input.keyboard?.once("keydown-ESC", () => {
      this.scene.start("TitleScene");
    });
  }
}
