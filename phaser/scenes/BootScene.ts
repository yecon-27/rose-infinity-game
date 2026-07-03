import Phaser from "phaser";

/**
 * Boot 场景:WebGL 能力检查,然后立即转 Preloader。
 * 不在这里加载资源(进度条还没出来,加载不可见)。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create() {
    const renderer = this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    if (!renderer.gl) {
      console.warn("[Filter] WebGL 不可用,降级 canvas 渲染(过滤器 shader 将失效)");
    }
    this.scene.start("PreloadScene");
  }
}
