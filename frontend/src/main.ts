import Phaser from 'phaser';
import './style.css';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { RankingScene } from './scenes/RankingScene';
import { ResultScene } from './scenes/ResultScene';
import { ExitScene } from './scenes/ExitScene';
import { SettingsScene } from './scenes/SettingsScene';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 540,
  height: 960,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  fps: { target: 60 },
  scene: [MenuScene, GameScene, RankingScene, SettingsScene, ResultScene, ExitScene],
});
