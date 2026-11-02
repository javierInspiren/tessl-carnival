# Whack-a-Mole

Whack the moles before they duck back into their holes.

## How to play

- Moles pop up from a grid of nine holes, stay up for a moment, then drop back down.
- Click a mole while it's up to whack it.
- The round lasts 30 seconds. As the clock runs down, moles pop up more often
  and stay up for less time: from a new mole every 1 second, up for 1.2
  seconds, at the start, to a new mole every 0.35 seconds, up for 0.6 seconds,
  at the end.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Clicking an empty hole costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `popUp`, `whack`,
  `spawnInterval`, `upTime`) and the `whackAMole` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.
