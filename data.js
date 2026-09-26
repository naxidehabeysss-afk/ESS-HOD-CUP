/* =====================================================================
   ESS HOD CUP 2026 - TOURNAMENT DATA
   This is the only file you need to edit to update the website.
   Edit it on GitHub (open the file, click the pencil icon), commit,
   and the live site updates within a minute or two.
   ===================================================================== */

const TZ = "Asia/Karachi";              // time zone used to show kick-off times
const TOURNAMENT_START = "2026-10-02T15:00:00+05:00";  // countdown target: 2 October, 15:00
const DEFAULT_VENUE = "";   // e.g. "ESS Ground" once confirmed

/* Teams: { id, name, short (2-4 letters for the badge), color, captain }
   Example: { id: "ops", name: "Operations", short: "OPS", color: "#0353A4", captain: "Full Name" } */
const TEAMS = [];

/* Players: { team: teamId, jersey, name, position: Goalkeeper | Defender | Midfielder | Forward } */
const PLAYERS = [];

/* Matches: { id, md (matchday), date: "2026-10-02T15:00:00+05:00", home: teamId, away: teamId, venue,
              hs, as (scores, once played), goals: [[teamId, jersey, minute]], summary }
   A knockout match can use stage: "Final", homeSeed: 1, awaySeed: 2 until the teams are known. */
const MATCHES = [];
