import { redirect } from "next/navigation";

/**
 * 首页直接重定向到 /play(Phaser 挂载点)。
 * 保持首页零 JS,Phaser bundle 只在 /play 懒加载。
 */
export default function Home() {
  redirect("/play");
}
