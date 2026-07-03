import Phaser from "phaser";

/**
 * 序章:黑屏逐句浮现,点击/空格推进。
 * 文案复用自旧 app/prologue/page.tsx 的 SCREENS。
 * 完成后进入 GameScene{act1_aa}。
 */
const SCREENS: string[][] = [
  ["有些话,你从来没有说出口。"],
  ["不是不想说。", "是话到嘴边,会自己变成另一句。"],
  ["轻一点的。客气一点的。安全一点的。"],
  ["你是阿沉。", "和阿默在一起,七个月了。"],
  [
    "她很好。你们不吵架,不催促,不纠缠。",
    "体面得像一对成年人。",
  ],
  ["只是每次分开的时候,你都觉得,有什么话没有说。"],
  ["今晚是第七次约会。", "吃完饭了。账单放在桌上。"],
  ["你心里有句话,正在往喉咙口爬。"],
];

export class PrologueScene extends Phaser.Scene {
  private idx = 0;
  private advancing = false;

  constructor() {
    super({ key: "PrologueScene" });
  }

  create() {
    this.idx = 0;
    this.advancing = false;
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.renderScreen();

    const advance = () => this.advance();
    this.input.keyboard?.on("keydown-SPACE", advance);
    this.input.keyboard?.on("keydown-ENTER", advance);
    this.input.on("pointerdown", advance);

    // Esc 跳过(二周目玩家)
    this.input.keyboard?.once("keydown-ESC", () => this.gotoGame());
  }

  private renderScreen() {
    const { width, height } = this.scale;
    const lines = SCREENS[this.idx];

    // 旧画面淡出再画新画面(除首屏)
    const container = this.add.container(width / 2, height / 2);
    const lineH = 48;
    const totalH = lines.length * lineH;
    const startY = -totalH / 2 + lineH / 2;

    lines.forEach((line, i) => {
      const txt = this.add
        .text(0, startY + i * lineH, line, {
          fontFamily: "serif",
          fontSize: "22px",
          color: "#dcdcd4",
        })
        .setOrigin(0.5)
        .setLetterSpacing(2)
        .setAlpha(0);
      container.add(txt);
      this.tweens.add({
        targets: txt,
        alpha: { from: 0, to: 0.92 },
        duration: 900,
        delay: i * 280,
        ease: "Sine.out",
      });
    });

    // 进度指示
    const progress = this.add
      .text(width / 2, height - 50, `${this.idx + 1} / ${SCREENS.length}`, {
        fontFamily: "serif",
        fontSize: "12px",
        color: "#3a3a35",
      })
      .setOrigin(0.5)
      .setLetterSpacing(4);

    // 末屏提示
    if (this.idx === SCREENS.length - 1) {
      const hint = this.add
        .text(width / 2, height - 90, "▼ 推开那扇门", {
          fontFamily: "serif",
          fontSize: "14px",
          color: "#7a7a70",
        })
        .setOrigin(0.5)
        .setLetterSpacing(8)
        .setAlpha(0);
      this.tweens.add({
        targets: hint,
        alpha: { from: 0.3, to: 0.9 },
        duration: 1300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      container.add(hint);
    }
    container.add(progress);

    // 标记当前 container 供 advance 时淡出
    this.currentContainer = container;
  }

  private currentContainer?: Phaser.GameObjects.Container;

  private advance() {
    if (this.advancing) return;
    this.advancing = true;
    if (this.idx >= SCREENS.length - 1) {
      this.gotoGame();
      return;
    }
    this.idx++;
    const old = this.currentContainer;
    if (old) {
      this.tweens.add({
        targets: old,
        alpha: 0,
        duration: 350,
        ease: "Sine.in",
        onComplete: () => old.destroy(),
      });
    }
    this.time.delayedCall(200, () => {
      this.renderScreen();
      this.advancing = false;
    });
  }

  private gotoGame() {
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.time.delayedCall(700, () => {
      this.scene.start("GameScene", { sceneId: "act1_aa" });
    });
  }
}
