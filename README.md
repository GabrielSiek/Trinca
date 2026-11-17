# Cutting

Diet and training tracker. The server runs on a homeserver; the app opens in a browser on the same Wi-Fi, on a computer or phone. The interface is in Portuguese.

- **Client:** React, TypeScript, styled-components, Vite
- **Server:** plain Node with its built-in HTTP server and SQLite. It has no runtime dependencies and uses about 70 MB of RAM.
- **Food values:** TACO (590 foods, stored locally, works offline) and Open Food Facts (packaged products, needs internet)

## Requirements

- **Node 22.18 or newer.** Older versions fail with `Unknown file extension ".ts"`. Node 22 needs 64-bit Windows 10+, or Linux with glibc 2.28+.
- **Yarn 1** to install and build. The laptop only needs it if you build there.

## Run it

```sh
yarn install
yarn build
yarn start
```

Open `http://localhost:3000`. The server also prints its network address, such as `http://192.168.0.10:3000`; open that one on your phone. On Windows, allow Node through the firewall when asked.

The first start creates the database with the meal plan, the five workouts and the starting weight and measurements.

For development, `yarn dev` runs the server and Vite together at `http://localhost:5173`.

## Move it to the laptop

Build on your main computer and copy only these folders, keeping the structure:

```
client/dist/
server/
```

Then run this from that folder on the laptop. No `yarn install` is needed:

```sh
node --disable-warning=ExperimentalWarning server/src/index.ts
```

To start it with the laptop:

- **Windows:** in Task Scheduler, create a task that runs at startup. Set the program to `node`, the arguments to the line above without `node`, and "Start in" to the project folder.
- **Linux:** use a systemd service:

```ini
[Service]
WorkingDirectory=/home/you/cutting
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning server/src/index.ts
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Settings

Set these as environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Address to listen on. The default is every network interface, so set the laptop's LAN address to limit it to that one. |
| `DB_PATH` | `server/data/dieta.db` | Database location |
| `OFF_USER_AGENT` | `CuttingApp/1.0 (uso pessoal)` | Sent to Open Food Facts, which asks apps to identify themselves. Add a contact here if you want. |

Goals, dates and the plan are in [server/src/seed.ts](server/src/seed.ts). They are only read when the database is first created, so after changing them, delete the database or edit its `settings` table.

## Back up your data

Everything is in one file. Stop the server with Ctrl+C, then copy `server/data/dieta.db`.

If the server was killed instead of stopped, or is still running, copy all the `dieta.db*` files. Recent data may be in the `-wal` file.

Keep the live database out of OneDrive or any other synced folder, because sync tools can corrupt a SQLite database that is in use. Use `DB_PATH` to put it somewhere else.

## How adding food works

- **Search** looks in TACO and your saved foods right away, then in Open Food Facts once you stop typing. Open Food Facts allows 10 searches a minute, so results are cached for 30 days and the app stays under the limit.
- **"Buscar valores"** splits a sentence into foods and amounts with fixed rules, not AI, and needs no API key. It knows about 60 everyday foods and their usual portions, in [server/src/foods/aliases.ts](server/src/foods/aliases.ts). Add entries there to teach it more.
- **Foods it can't find** are marked "não encontrado". You can search for them or type in the label values.

## Limits

- **No login.** Anyone who can reach the port can open the app and change its data. Keep it on your home network, and never forward the port to the internet.
- **Swaps are estimates.** Meal totals are the plan's numbers. A swap moves them by the difference between two foods, and per-item values come from TACO or typical labels.
- **Open Food Facts is written by volunteers,** so check the values on unfamiliar products.

## Tests

```sh
yarn test
yarn typecheck
```
