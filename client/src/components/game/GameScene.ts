import Phaser from 'phaser';
import { Socket } from 'socket.io-client';

interface Player {
  userId: string;
  username: string;
  team: number;
  position: { x: number; y: number };
  health: number;
  stamina: number;
  status: string;
}

interface GameSceneConfig {
  socket: Socket;
  matchId: string;
  userId: string;
}

class GameScene extends Phaser.Scene {
  // Game configuration
  private socket: Socket;
  private matchId: string;
  private userId: string;
  
  // Game objects
  private players: Map<string, Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>;
  private playerInfo: Map<string, Player>;
  private healthBars: Map<string, { container: Phaser.GameObjects.Rectangle; bar: Phaser.GameObjects.Rectangle }>;
  private staminaBars: Map<string, { container: Phaser.GameObjects.Rectangle; bar: Phaser.GameObjects.Rectangle }>;
  private usernames: Map<string, Phaser.GameObjects.Text>;
  private obstacles: Phaser.Physics.Arcade.StaticGroup;
  
  // Controls
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey: Phaser.Input.Keyboard.Key;
  private specialKey: Phaser.Input.Keyboard.Key;
  
  // UI
  private statusText: Phaser.GameObjects.Text;
  private countdownText: Phaser.GameObjects.Text;
  
  // Game state
  private isGameActive: boolean;
  
  constructor(config: GameSceneConfig) {
    super('GameScene');
    this.socket = config.socket;
    this.matchId = config.matchId;
    this.userId = config.userId;
    
    this.players = new Map();
    this.playerInfo = new Map();
    this.healthBars = new Map();
    this.staminaBars = new Map();
    this.usernames = new Map();
    
    this.isGameActive = false;
  }
  
  preload() {
    // Load sprite sheets
    this.load.spritesheet('knight', 'assets/characters/knight.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('rogue', 'assets/characters/rogue.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sorcerer', 'assets/characters/sorcerer.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('berserker', 'assets/characters/berserker.png', { frameWidth: 32, frameHeight: 32 });
    
    // Load tileset
    this.load.image('tiles', 'assets/tilemaps/tiles.png');
    this.load.tilemapTiledJSON('arena', 'assets/tilemaps/arena.json');
    
    // Load effects
    this.load.spritesheet('slash', 'assets/effects/slash.png', { frameWidth: 48, frameHeight: 48 });
    
    // Load UI elements
    this.load.image('ui-panel', 'assets/ui/panel.png');
  }
  
  create() {
    // Set up the arena
    this.createArena();
    
    // Create player animations
    this.createAnimations();
    
    // Set up UI
    this.createUI();
    
    // Set up controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.specialKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    
    // Set up socket events
    this.setupSocketEvents();
    
    // Join match
    this.socket.emit('join-match', this.matchId);
  }
  
  update() {
    if (!this.isGameActive) return;
    
    const player = this.players.get(this.userId);
    if (!player) return;
    
    // Handle player movement
    this.handlePlayerMovement(player);
    
    // Handle attacks
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.handlePlayerAttack('light');
    } else if (Phaser.Input.Keyboard.JustDown(this.specialKey)) {
      this.handlePlayerAttack('heavy');
    }
    
    // Update UI elements
    this.updateUIElements();
  }
  
  private createArena() {
    // Create a simple tilemap arena
    const map = this.make.tilemap({ key: 'arena' });
    const tileset = map.addTilesetImage('arena-tiles', 'tiles');
    
    // Create layers
    const groundLayer = map.createLayer('Ground', tileset, 0, 0);
    const wallsLayer = map.createLayer('Walls', tileset, 0, 0);
    
    // Set collisions for walls
    wallsLayer.setCollisionByProperty({ collides: true });
    
    // Create obstacles group
    this.obstacles = this.physics.add.staticGroup();
    
    // Add objects from Tiled as obstacles
    const objectLayer = map.getObjectLayer('Objects');
    objectLayer.objects.forEach(obj => {
      const obstacle = this.obstacles.create(obj.x, obj.y, 'tiles', obj.gid - 1);
      obstacle.setOrigin(0, 1);
      obstacle.setImmovable(true);
      
      // Adjust hit area to match visible area
      const width = obj.width || 32;
      const height = obj.height || 32;
      obstacle.body.setSize(width, height);
    });
  }
  
  private createAnimations() {
    // Knight animations
    this.anims.create({
      key: 'knight-idle',
      frames: this.anims.generateFrameNumbers('knight', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    
    this.anims.create({
      key: 'knight-run',
      frames: this.anims.generateFrameNumbers('knight', { start: 4, end: 11 }),
      frameRate: 12,
      repeat: -1
    });
    
    this.anims.create({
      key: 'knight-attack',
      frames: this.anims.generateFrameNumbers('knight', { start: 12, end: 15 }),
      frameRate: 12,
      repeat: 0
    });
    
    // Similar animations for other characters...
  }
  
  private createUI() {
    // Status text
    this.statusText = this.add.text(16, 16, 'Connecting...', {
      fontSize: '18px',
      color: '#ffffff'
    });
    this.statusText.setScrollFactor(0);
    
    // Countdown text
    this.countdownText = this.add.text(400, 300, '', {
      fontSize: '64px',
      color: '#ffffff'
    });
    this.countdownText.setOrigin(0.5);
    this.countdownText.setScrollFactor(0);
    this.countdownText.setVisible(false);
  }
  
  private setupSocketEvents() {
    // Match data received
    this.socket.on('match-data', (data) => {
      this.statusText.setText(`Waiting for players (${data.match.players.length}/${data.match.maxPlayers})`);
    });
    
    // Match starting
    this.socket.on('match-started', (data) => {
      this.statusText.setText('Match starting...');
      this.countdownText.setVisible(true);
      this.countdownText.setText(data.countdown.toString());
    });
    
    // Countdown update
    this.socket.on('countdown', (data) => {
      this.countdownText.setText(data.countdown.toString());
    });
    
    // Game started
    this.socket.on('game-started', (data) => {
      this.statusText.setText('Fight!');
      this.countdownText.setVisible(false);
      
      // Create players
      data.players.forEach((playerData: Player) => {
        this.createPlayer(playerData);
      });
      
      this.isGameActive = true;
    });
    
    // Player moved
    this.socket.on('player-moved', (data) => {
      const player = this.players.get(data.userId);
      if (player) {
        // Move the player sprite to the new position
        this.tweens.add({
          targets: player,
          x: data.position.x,
          y: data.position.y,
          duration: 100,
          ease: 'Linear'
        });
        
        // Update player info
        const info = this.playerInfo.get(data.userId);
        if (info) {
          info.position = data.position;
        }
        
        // Update UI elements
        this.updatePlayerUI(data.userId);
      }
    });
    
    // Player attacked
    this.socket.on('player-attacked', (data) => {
      const attacker = this.players.get(data.userId);
      if (attacker) {
        // Play attack animation
        attacker.anims.play(`${this.getArchetypeForUser(data.userId)}-attack`, true);
        
        // Update stamina
        const attackerInfo = this.playerInfo.get(data.userId);
        if (attackerInfo) {
          attackerInfo.stamina = data.stamina;
          this.updatePlayerUI(data.userId);
        }
        
        // Create attack effect based on direction
        this.createAttackEffect(data.userId, data.direction, data.attackType);
        
        // Handle hit players
        data.hitPlayers.forEach((hitData: { userId: string; damage: number; health: number; defeated: boolean }) => {
          const hitPlayer = this.players.get(hitData.userId);
          if (hitPlayer) {
            // Flash the sprite
            this.tweens.add({
              targets: hitPlayer,
              alpha: 0.5,
              duration: 100,
              yoyo: true
            });
            
            // Update health
            const hitPlayerInfo = this.playerInfo.get(hitData.userId);
            if (hitPlayerInfo) {
              hitPlayerInfo.health = hitData.health;
              hitPlayerInfo.status = hitData.defeated ? 'defeated' : 'alive';
              
              // Update UI
              this.updatePlayerUI(hitData.userId);
              
              // Handle defeated player
              if (hitData.defeated) {
                hitPlayer.setTint(0xff0000);
                hitPlayer.anims.play(`${this.getArchetypeForUser(hitData.userId)}-idle`);
              }
            }
          }
        });
      }
    });
    
    // Match ended
    this.socket.on('match-ended', (data) => {
      this.isGameActive = false;
      
      // Display winner
      let winnerText = 'Match ended!';
      if (data.winner) {
        if (typeof data.winner === 'number') {
          winnerText = `Team ${data.winner} wins!`;
        } else {
          const winnerInfo = this.playerInfo.get(data.winner);
          if (winnerInfo) {
            winnerText = `${winnerInfo.username} wins!`;
          }
        }
      }
      
      this.statusText.setText(winnerText);
      
      // Show a winner overlay
      const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
      overlay.setScrollFactor(0);
      
      const resultText = this.add.text(400, 200, winnerText, {
        fontSize: '32px',
        color: '#ffffff'
      });
      resultText.setOrigin(0.5);
      resultText.setScrollFactor(0);
      
      // Show rewards
      const player = data.players.find((p: any) => p.userId === this.userId);
      if (player) {
        const rewardText = this.add.text(400, 250, `You earned ${player.sasRewards} $SNS!`, {
          fontSize: '24px',
          color: '#ffd700'
        });
        rewardText.setOrigin(0.5);
        rewardText.setScrollFactor(0);
      }
      
      // Return to lobby button
      const button = this.add.rectangle(400, 350, 200, 50, 0xf97316);
      button.setScrollFactor(0);
      button.setInteractive({ useHandCursor: true });
      
      const buttonText = this.add.text(400, 350, 'Return to Lobby', {
        fontSize: '18px',
        color: '#ffffff'
      });
      buttonText.setOrigin(0.5);
      buttonText.setScrollFactor(0);
      
      button.on('pointerdown', () => {
        // Disconnect socket for this match
        this.socket.emit('leave-match', this.matchId);
        
        // Redirect to lobby
        window.location.href = '/lobby';
      });
    });
    
    // Error handling
    this.socket.on('error', (data) => {
      this.statusText.setText(`Error: ${data.message}`);
    });
  }
  
  private createPlayer(playerData: Player) {
    // Store player info
    this.playerInfo.set(playerData.userId, { ...playerData });
    
    // Determine the character sprite based on archetype
    const archetype = this.getArchetypeForUser(playerData.userId);
    
    // Create player sprite
    const player = this.physics.add.sprite(
      playerData.position.x,
      playerData.position.y,
      archetype
    );
    
    // Set up physics
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, this.obstacles);
    
    // Store player sprite
    this.players.set(playerData.userId, player);
    
    // Set initial animation
    player.anims.play(`${archetype}-idle`);
    
    // Create health bar
    const healthBarContainer = this.add.rectangle(
      playerData.position.x,
      playerData.position.y - 20,
      50,
      6,
      0x000000
    );
    
    const healthBar = this.add.rectangle(
      playerData.position.x - 25 + (50 * playerData.health / 100) / 2,
      playerData.position.y - 20,
      50 * playerData.health / 100,
      6,
      0x00ff00
    );
    
    this.healthBars.set(playerData.userId, {
      container: healthBarContainer,
      bar: healthBar
    });
    
    // Create stamina bar
    const staminaBarContainer = this.add.rectangle(
      playerData.position.x,
      playerData.position.y - 14,
      50,
      4,
      0x000000
    );
    
    const staminaBar = this.add.rectangle(
      playerData.position.x - 25 + (50 * playerData.stamina / 100) / 2,
      playerData.position.y - 14,
      50 * playerData.stamina / 100,
      4,
      0x0000ff
    );
    
    this.staminaBars.set(playerData.userId, {
      container: staminaBarContainer,
      bar: staminaBar
    });
    
    // Create username text
    const username = this.add.text(
      playerData.position.x,
      playerData.position.y - 35,
      playerData.username,
      {
        fontSize: '12px',
        color: playerData.userId === this.userId ? '#ffff00' : '#ffffff'
      }
    );
    username.setOrigin(0.5);
    this.usernames.set(playerData.userId, username);
  }
  
  private getArchetypeForUser(userId: string): string {
    const info = this.playerInfo.get(userId);
    if (info) {
      // This is a simplified version; in a real game you would determine this from user settings
      const team = info.team || 0;
      switch (team % 4) {
        case 0: return 'knight';
        case 1: return 'rogue';
        case 2: return 'sorcerer';
        case 3: return 'berserker';
        default: return 'knight';
      }
    }
    return 'knight';
  }
  
  private handlePlayerMovement(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
    const speed = 160;
    let velocityX = 0;
    let velocityY = 0;
    
    // Handle keyboard input
    if (this.cursors.left.isDown) {
      velocityX = -speed;
      player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      velocityX = speed;
      player.setFlipX(false);
    }
    
    if (this.cursors.up.isDown) {
      velocityY = -speed;
    } else if (this.cursors.down.isDown) {
      velocityY = speed;
    }
    
    // Apply diagonal movement normalization
    if (velocityX !== 0 && velocityY !== 0) {
      const factor = 1 / Math.sqrt(2);
      velocityX *= factor;
      velocityY *= factor;
    }
    
    // Set velocity
    player.setVelocity(velocityX, velocityY);
    
    // Play animation
    if (velocityX !== 0 || velocityY !== 0) {
      player.anims.play(`${this.getArchetypeForUser(this.userId)}-run`, true);
    } else {
      player.anims.play(`${this.getArchetypeForUser(this.userId)}-idle`, true);
    }
    
    // Update player position on server if moved
    if (velocityX !== 0 || velocityY !== 0) {
      this.socket.emit('player-move', {
        matchId: this.matchId,
        position: { x: player.x, y: player.y }
      });
      
      // Update player info locally
      const info = this.playerInfo.get(this.userId);
      if (info) {
        info.position = { x: player.x, y: player.y };
      }
      
      // Update UI elements
      this.updatePlayerUI(this.userId);
    }
  }
  
  private handlePlayerAttack(attackType: 'light' | 'heavy') {
    // Get player direction based on facing
    const player = this.players.get(this.userId);
    if (!player) return;
    
    let direction = 'right';
    if (player.flipX) {
      direction = 'left';
    } else if (this.cursors.up.isDown) {
      direction = 'up';
    } else if (this.cursors.down.isDown) {
      direction = 'down';
    }
    
    // Play attack animation
    player.anims.play(`${this.getArchetypeForUser(this.userId)}-attack`, true);
    
    // Send attack to server
    this.socket.emit('player-attack', {
      matchId: this.matchId,
      attackType,
      direction
    });
  }
  
  private createAttackEffect(userId: string, direction: string, attackType: string) {
    const player = this.players.get(userId);
    if (!player) return;
    
    // Create attack effect sprite
    const effectScale = attackType === 'heavy' ? 1.5 : 1;
    const effect = this.add.sprite(player.x, player.y, 'slash');
    effect.setScale(effectScale);
    
    // Position effect based on direction
    switch (direction) {
      case 'up':
        effect.setPosition(player.x, player.y - 30);
        effect.setAngle(0);
        break;
      case 'down':
        effect.setPosition(player.x, player.y + 30);
        effect.setAngle(180);
        break;
      case 'left':
        effect.setPosition(player.x - 30, player.y);
        effect.setAngle(270);
        break;
      case 'right':
        effect.setPosition(player.x + 30, player.y);
        effect.setAngle(90);
        break;
    }
    
    // Play effect animation
    effect.anims.play('slash-effect');
    
    // Remove effect after animation completes
    effect.once('animationcomplete', () => {
      effect.destroy();
    });
  }
  
  private updateUIElements() {
    // Update all player UI elements
    this.players.forEach((_, userId) => {
      this.updatePlayerUI(userId);
    });
  }
  
  private updatePlayerUI(userId: string) {
    const player = this.players.get(userId);
    const info = this.playerInfo.get(userId);
    
    if (!player || !info) return;
    
    // Update health bar
    const healthBar = this.healthBars.get(userId);
    if (healthBar) {
      healthBar.container.setPosition(player.x, player.y - 20);
      
      const healthWidth = 50 * info.health / 100;
      healthBar.bar.setPosition(player.x - 25 + healthWidth / 2, player.y - 20);
      healthBar.bar.width = healthWidth;
      
      // Change color based on health
      if (info.health > 60) {
        healthBar.bar.fillColor = 0x00ff00; // Green
      } else if (info.health > 30) {
        healthBar.bar.fillColor = 0xffff00; // Yellow
      } else {
        healthBar.bar.fillColor = 0xff0000; // Red
      }
    }
    
    // Update stamina bar
    const staminaBar = this.staminaBars.get(userId);
    if (staminaBar) {
      staminaBar.container.setPosition(player.x, player.y - 14);
      
      const staminaWidth = 50 * info.stamina / 100;
      staminaBar.bar.setPosition(player.x - 25 + staminaWidth / 2, player.y - 14);
      staminaBar.bar.width = staminaWidth;
    }
    
    // Update username position
    const username = this.usernames.get(userId);
    if (username) {
      username.setPosition(player.x, player.y - 35);
    }
  }
}

export default GameScene; 