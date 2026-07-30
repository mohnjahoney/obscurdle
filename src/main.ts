import Phaser from "phaser"
import { MenuScene } from "./scenes/MenuScene"
import { PlayScene } from "./scenes/PlayScene"
import { GAME_STYLE } from "./style/gameStyle"
import { RENDER_SIZE } from "./style/rendering"
import "./styles.css"

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: RENDER_SIZE.width,
  height: RENDER_SIZE.height,
  backgroundColor: GAME_STYLE.color.paper,
  scene: [MenuScene, PlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: RENDER_SIZE.width,
    height: RENDER_SIZE.height,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },
}

new Phaser.Game(config)
