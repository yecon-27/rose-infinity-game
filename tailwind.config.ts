import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主题色:克制、冷淡、带点灰
        ink: "#1a1a1a",
        paper: "#f5f5f0",
        muted: "#8a8a85",
        whisper: "#b8b8b0", // 内心话的半透明灰
        accent: "#c4a882", // 暖色点缀,关系里那点温度
      },
      fontFamily: {
        serif: ["'Noto Serif SC'", "'Source Han Serif'", "Georgia", "serif"],
        sans: ["'Noto Sans SC'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
