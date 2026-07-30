import Phaser from "phaser"
import { GAME_LAYOUT } from "../style/layout"
import { GAME_STYLE } from "../style/gameStyle"

export class PaperBackdrop {
  constructor(scene: Phaser.Scene) {
    const paper = scene.add.rectangle(
      GAME_LAYOUT.width / 2,
      GAME_LAYOUT.height / 2,
      GAME_LAYOUT.width,
      GAME_LAYOUT.height,
      GAME_STYLE.color.paper,
    )
    paper.setDepth(-100)

    const rules = scene.add.graphics()
    rules.setDepth(-90)
    rules.lineStyle(
      GAME_STYLE.rule.thin,
      GAME_STYLE.color.lightRule,
      GAME_STYLE.alpha.softRule,
    )

    const inset = GAME_LAYOUT.page.inset
    rules.lineBetween(
      inset,
      GAME_LAYOUT.masthead.topRuleY,
      GAME_LAYOUT.width - inset,
      GAME_LAYOUT.masthead.topRuleY,
    )
    rules.lineBetween(
      inset,
      GAME_LAYOUT.masthead.bottomRuleY,
      GAME_LAYOUT.width - inset,
      GAME_LAYOUT.masthead.bottomRuleY,
    )
  }
}
