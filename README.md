# QTrend Warehouse Management

Tracks which products are in which warehouse positions. Staff sign in with Google and add, take or move items; every change is logged.

SvelteKit (static SPA) + Tailwind + Firebase (Hosting, Auth, Firestore). No backend.

## Data model (Firestore)

| Collection | Doc ID | Fields |
|---|---|---|
| `products` | SKU, e.g. `ABC-123` | `name`, `createdAt`, `createdBy` |
| `positions` | code, e.g. `A-01-03` | `note`, `createdAt`, `createdBy` |
| `stock` | `{positionId}__{productId}` | `positionId`, `productId`, `qty` (> 0), `updatedAt`, `updatedBy` |
| `hand` | `{uid}__{productId}` | items a user picked off a shelf and is carrying: `uid`, `email`, `by`, `productId`, `qty` |
| `movements` | auto | `kind` (`to-hand` / `from-hand` / `remove` / `correct`), `positionId`, `productId`, `delta`, `qtyAfter`, `uid`, `email`, `by`, `at` |
| `allowedUsers` | user's email | *(anything; the doc just has to exist)* |

A product can be in many positions and a position can hold many products. Each add/take/move runs as one transaction that updates `stock` and appends to `movements`, so stock never goes negative and the log always matches.

**Delta sync:** the app keeps a copy of positions/products/stock in localStorage and on reload only fetches docs whose `updatedAt` is newer. So every write to those collections must set `updatedAt` (server timestamp), and `stock` docs are set to `qty: 0` instead of deleted. After deleting docs any other way (e.g. `import-firestore.mjs --clear`), set `meta/sync.resetAt` to now so devices do a full reload.

Security rules (`firestore.rules`): any user listed in `allowedUsers` can read and write all app data; `allowedUsers` itself is managed only from the Firebase console.

## Firebase setup (one time)

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication** → Sign-in method → enable **Google**.
3. **Firestore Database** → create a database (production mode).
4. **Project settings** → Your apps → add a **Web app**, then copy its config into `.env` (see `.env.example`).
5. Install/update the CLI and link the project:
   ```
   npm i -g firebase-tools@latest
   firebase login
   firebase use --add
   ```
6. Deploy rules and indexes: `firebase deploy --only firestore`
7. Authorize users: in Firestore, create collection `allowedUsers` with one document per person, document ID = their Google email (e.g. `jane@example.com`).

## Develop

```
npm i
npm run dev
```

## Deploy

```
npm run build
firebase deploy --only hosting
```

Add your hosting domain (e.g. `your-project.web.app`) under Authentication → Settings → Authorized domains if it's not there already.
