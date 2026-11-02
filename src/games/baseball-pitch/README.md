# Baseball Pitch

Pick a pitch and throw it into the catcher's glove.

## How to play

- Choose a pitch with the buttons along the bottom, or press `1`, `2` or `3`.
- Move the mouse to aim, and click anywhere above the buttons to throw. The
  dashed line shows where you are aiming.
- The catcher slides the glove from side to side, so time your throw.
- Each pitch moves differently:

  | Key | Pitch     | Speed  | Movement                        | Points |
  | --- | --------- | ------ | ------------------------------- | ------ |
  | 1   | Fastball  | Fast   | Straight at your aim            | 10     |
  | 2   | Curveball | Slow   | Breaks 120 px right of your aim | 20     |
  | 3   | Slider    | Medium | Breaks 70 px left of your aim   | 15     |

- You can't change pitch while a ball is in the air.
- You have 10 pitches. The round ends when the last one lands.
- Click again on the game over screen to play another round.

## Scoring

A pitch scores its points when it lands within the glove, and nothing when it
misses. Your final score is saved to the carnival's score board when the round
ends.

## Files

- `game.ts`: the game logic (`createState`, `selectPitch`, `throwPitch`, `step`,
  `ballPosition`, `landingX`, `isCaught`) and the `baseballPitch` entry, the
  default export the midway finds.
- `game.test.ts`: tests for the game logic.
