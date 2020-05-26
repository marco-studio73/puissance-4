import { Component, OnInit, ViewChild } from '@angular/core';
import { GRID_CONFIG } from 'src/app/share/enum/grid.enum';
import { Observable, Subscription, timer } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ThemeService } from 'src/app/share/service/theme.service';
import { IPlayer } from 'src/app/share/models/player';
import { Store } from '@ngxs/store';
import { transition, trigger, useAnimation } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { UpdatePlayer } from 'src/app/utils/store/action/player.action';
import { FirstPlayerComponent } from '../dialog/first-player/first-player.component';
import { MobileService } from 'src/app/share/service/mobile.service';
import { IMobile } from 'src/app/share/models/mobile';

import {
  bounceInTop,
  useBounceInUpAnimation,
} from 'src/app/share/animations/bounce.animation';
import { PlayerService } from 'src/app/share/service/player.service';

@Component({
  selector: 'grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  animations: [
    bounceInTop,
    trigger('bounceInTop', [
      transition(':enter', useBounceInUpAnimation('1s')),
    ]),
  ],
})
export class GridComponent implements OnInit {
  private subs: Subscription[] = [];

  counter$: Observable<number>;
  public count = 4;

  private $mobile: Observable<IMobile>;
  public isMobile: boolean;

  private $players: Observable<IPlayer[]>;
  public players: IPlayer[] = [];

  public isDarkTheme: Observable<Boolean>;

  private rows: number = GRID_CONFIG.ROWS;
  private columns: number = GRID_CONFIG.COLUMN;
  public firstCellAvailble;

  public animationActive: boolean = false;
  public animationState: string;

  public highlightedCol: number;

  public turn: number;
  private moves = 0;
  public winner: IPlayer = null;

  public grid = new Array(this.rows);

  constructor(
    private themeService: ThemeService,
    private mobileService: MobileService,
    private playerService: PlayerService,
    private store: Store,
    public dialog: MatDialog
  ) {
    this.isDarkTheme = this.themeService.isDarkTheme;
  }

  ngOnInit(): void {
    this.counter$ = timer(0, 700).pipe(
      take(this.count),
      map(() => {
        return --this.count;
      })
    );

    this.$players = this.store.select((state) => state.Players.players);
    this.subs.push(
      this.$players.subscribe((player: IPlayer[]) => {
        this.players = player;
        if (this.players.length === 0) {
          this.players = this.playerService.getplayer('players');
        }
      })
    );

    this.$mobile = this.store.select((state) => state.Mobile.mobile);
    this.subs.push(
      this.$mobile.subscribe((isMobile: IMobile) => {
        this.isMobile = isMobile.isMobile;
      })
    );

    this.wichPlayerStart();

    this.counter$.subscribe((count) => {
      if (count === 0) {
        this.renderGrid();
        this.dialog.closeAll();
      }
    });
  }

  //init the number of token for player
  initPlayerToken() {
    this.players.forEach((player: IPlayer) => {
      player.tokens = 21;
    });
  }

  // create initial grid empty
  public renderGrid() {
    this.initPlayerToken();
    this.moves = 0;
    this.winner = null;
    for (let i = 0; i < this.rows; i++) {
      this.grid[i] = new Array(this.columns)
        .fill(null)
        .map(() => ({ value: 0 }));
    }
  }

  // decrement tokens of the player who is playing and uptate the state in the store
  decrementTokenPlayer(turn: number) {
    this.players.forEach((player: IPlayer) => {
      if (player.player === turn) {
        player.tokens--;
        this.store.dispatch(new UpdatePlayer(player));
      }
    });
  }

  //define the first player who play
  wichPlayerStart() {
    if (this.winner === null) {
      this.turn = Math.floor(Math.random() * Math.floor(3));
      if (this.turn === 0) {
        this.wichPlayerStart();
      } else {
        if (this.players.length) {
          this.dialog.open(FirstPlayerComponent, {
            data: { players: this.players, turn: this.turn },
          });
        }
      }
    } else {
      switch (this.winner.player) {
        case 1:
          this.turn = 2;
          break;
        case 2:
          this.turn = 1;
          break;
        default:
      }
    }
  }

  // define witch column is highlighted
  highlighted(column: number) {
    this.highlightedCol = column;
  }

  oddOrEven(turn: number) {
    return turn & 1 ? 1 : 2;
  }

  public play(column: number) {
    this.animationActive = false;

    if (this.winner === null) {
      this.animationState = 'start';
      // find the first empty cell of the column

      let row: number;
      for (let i = this.rows - 1; i >= 0; i--) {
        if (this.grid[i][column].value === 0) {
          row = i;
          break;
        }
      }

      // if no cell is empty the column is full
      if (row === undefined) {
        return window.alert('Column is full!');
      } else {
        // switch the turn
        if (this.oddOrEven(this.turn) === 1) {
          this.turn = 1;
        } else {
          this.turn = 2;
        }

        this.displayToken(row, column, this.turn);

        // increment turn
        this.turn++;

        // Renvoyer la ligne où on a joué
        return row;
      }
    }
  }

  // put the token in the cell with the good color
  displayToken(row: number, column: number, player: number) {
    this.grid[row][column].value = player;

    if (this.win(row, column, this.turn)) {
      this.defineWinner(this.turn);
    } else {
      this.moves === this.rows * this.columns - 1
        ? alert('match null')
        : this.moves++;
    }

    this.decrementTokenPlayer(player);
  }

  defineWinner(turn: number) {
    this.players.forEach((player: IPlayer) => {
      if (player.player === turn) {
        this.winner = player;
        player.score++;
      }
    });
    this.playerService.setPlayers('players', this.players);
  }

  win(row: number, column: number, player: number) {
    // Horizontal
    let count = 0;
    for (let j = 0; j < this.columns; j++) {
      count = this.grid[row][j].value == player ? count + 1 : 0;
      if (count >= 4) return true;
    }
    // Vertical
    count = 0;
    for (let i = 0; i < this.rows; i++) {
      count = this.grid[i][column].value == player ? count + 1 : 0;
      if (count >= 4) return true;
    }
    // Diagonal
    count = 0;
    let shift = row - column;
    for (
      let i = Math.max(shift, 0);
      i < Math.min(this.rows, this.columns + shift);
      i++
    ) {
      count = this.grid[i][i - shift].value == player ? count + 1 : 0;
      if (count >= 4) return true;
    }
    // Anti-diagonal
    count = 0;
    shift = row + column;

    for (
      let i = Math.max(shift - this.columns + 1, 0);
      i < Math.min(this.rows, shift + 1);
      i++
    ) {
      count = this.grid[i][shift - i].value == player ? count + 1 : 0;
      if (count >= 4) return true;
    }

    return false;
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub: Subscription) => {
      sub.unsubscribe();
    });
  }
}
