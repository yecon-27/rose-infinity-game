import Phaser from "phaser";

/**
 * Title 场景:标题主视觉 + "开始" 提示。
 * Day 1 只做最小可视化验证;Day 2 会加序章跳转 + 字间距动画。
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "TitleScene" });
  }

  create() {
    const { width, height } = this.scale;

    // 标题主视觉:cover 缩放铺满
    const bg = this.add.image(width / 2, height / 2, "title-keyart");
    const cover = Math.max(width / bg.width, height / bg.height);
    bg.setScale(cover);

    // 暗角让前景文字可读
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);

    // 副标题
    this.add
      .text(width / 2, height / 2 - 140, "一段没有争吵的关系,是怎么结束的", {
        fontFamily: "serif",
        fontSize: "20px",
        color: "#9a9a90",
      })
      .setOrigin(0.5)
      .setLetterSpacing(4);

    // 主标题
    this.add
      .text(width / 2, height / 2 - 60, "过滤器", {
        fontFamily: "serif",
        fontSize: "112px",
        color: "#f5f5f0",
      })
      .setOrigin(0.5)
      .setLetterSpacing(16);

    this.add
      .text(width / 2, height / 2 + 20, "THE FILTER", {
        fontFamily: "serif",
        fontSize: "18px",
        color: "#6a6a60",
      })
      .setOrigin(0.5)
      .setLetterSpacing(12);

    // 开始提示:呼吸
    const startHint = this.add
      .text(width / 2, height / 2 + 180, "开 始   Enter", {
        fontFamily: "serif",
        fontSize: "22px",
        color: "#b8b8b0",
      })
      .setOrigin(0.5)
      .setLetterSpacing(8);

    this.tweens.add({
      targets: startHint,
      alpha: { from: 0.3, to: 0.95 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // 底部署名
    this.add
      .text(width / 2, height - 40, "腾讯云黑客松 2026 · 叙事游戏", {
        fontFamily: "serif",
        fontSize: "12px",
        color: "#3a3a35",
      })
      .setOrigin(0.5)
      .setLetterSpacing(6);

    // Enter / 点击 → Prologue
    const start = () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => {
        this.scene.start("PrologueScene");
      });
    };
    this.input.keyboard?.once("keydown-ENTER", start);
    this.input.keyboard?.once("keydown-SPACE", start);
    this.input.once("pointerdown", start);
  }
}
