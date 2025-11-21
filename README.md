# Hi-Fi Rush Manual

Hi-Fi Rush is a 2023 game by Tango Gameworks. It is a hack and slash game where everything (and I mean *everything*) is in sync with the beat of the music.

This manual includes 400+ locations as of right now. By default, the only locations are beating every Chorus along every Track and also finishing the Track. But there are options to include reading vlogs, collecting upgrades, interacting with robots, finding graffiti, breaking statues, pummeling vending machines, and shooting down billboard drone robots.

The item count is considerably fewer as of right now: access to tracks and the three partner summons. Everything else is gears.

Note: This randomizer was built with the idea that partner summons would only be restricted outside of battle, and that the player can use any partners they have in-game in battle. It just makes the logic easier and more open to gate only level progress and not battles.

By default, this randomizer is meant to be played on a save file that has completed the main game, so that any Track can be accessed in any order. Most of the sanity options are for things that are not permanent upgrade pickups.

There is, however, option to play on a new save, where it will assume Track order and not include any post-game only checks. Just don't skip any checks, because the game doesn't allow backtracking on a new file.

## Building
To build this project, run `npm install` in the root folder to install dependencies, then run `node build.js` (optionally with the path to your custom worlds folder). It will build `manual_hifirush_tustin2121.apworld` to your specified path or put it in an `out` folder if you didn't provide a path.

