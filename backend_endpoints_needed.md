## 4. `GET /api/sorare/player/<player_slug>`

**Purpose:** Returns the full player profile for the player page header (name, team, position, age, country, photos).

**What it should return (single JSON object):**

```json
{
  "player_slug": "albert-rusnak",
  "player_display_name": "Albert Rusnak",
  "team_name": "Seattle Sounders FC",
  "team_picture_url": "https://...",
  "position": ["Midfielder"],
  "age": 30,
  "country": "Slovakia",
  "country_flag_url": "https://...",
  "picture_url": "https://..."
}
```

**Backend query logic:**

- Look up from `player_pool` table: `WHERE player_slug = :slug`
- `player_display_name` from the main column or `meta`
- `team_name` from `meta->team_name`
- `team_picture_url` from `meta->team_picture_url` (Sorare club picture)
- `position` from `meta->position` (can be an array like `["Midfielder"]`)
- `age` from `meta->age` (integer, calculated from birth date if needed)
- `country` from `meta->country` (nationality string)
- `country_flag_url` from `meta->country_flag_url` (flag image URL from Sorare)
- `picture_url` from `meta->picture_url` (player headshot)
- If player not found, return `404`

**Notes:**

- `age` and `country` / `country_flag_url` and `team_picture_url` are **new fields** that need to be added to the `meta` JSON (or as dedicated columns) in the `player_pool` table.
- These values can be sourced from the Sorare GraphQL API player data during your sync process.

---

## Summary of Homepage Panel Mapping

| Panel                      | Endpoint                          | Data                                        |
| -------------------------- | --------------------------------- | ------------------------------------------- |
| 24 HOUR MARKET OVERVIEW    | `/api/sorare/market_overview_24h` | Volume, count, avg, buyers, sellers, trend  |
| TOP AUCTIONS (24H)         | `/api/sorare/top_auctions_24h`    | Highest auction per scarcity (L/R/SR/U)     |
| QUICK ACCESS (Most Traded) | `/api/sorare/most_traded_24h`     | Players with most sales in past 24h         |
| SYSTEM STATUS              | (no new endpoint needed)          | Uses existing player index count + API ping |
| CONTACT                    | (no endpoint needed)              | Static content                              |
| DONATE                     | (no endpoint needed)              | Static content                              |
