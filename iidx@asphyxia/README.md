# beatmaniaIIDX

Plugin Version: **v0.1.18a**

---

Supported Versions
  - beatmaniaIIDX 9th Style (JAH)
  - beatmaniaIIDX 10th Style (JAE)
  - beatmaniaIIDX 11 IIDXRED (JAB)
  - beatmaniaIIDX 12 HAPPY SKY (JAC)
  - beatmaniaIIDX 13 DistorteD (JAC)
  - beatmaniaIIDX 14 GOLD (2007072301)
  - beatmaniaIIDX 15 DJ TROOPERS (2008031100)
  - beatmaniaIIDX 16 EMPRESS (2009072200)
  - beatmaniaIIDX 17 SIRIUS (2010071200)
  - beatmaniaIIDX 18 Resort Anthem (2011071200)
  - beatmaniaIIDX 19 Lincle (2012090300)
  - beatmaniaIIDX 20 tricoro (2013090900)
  - beatmaniaIIDX 21 SPADA (2014071600)
  - beatmaniaIIDX 22 PENDUAL (2015080500)
  - beatmaniaIIDX 23 copula (2016083100)
  - beatmaniaIIDX 24 SINOBUZ (2017082800)
  - beatmaniaIIDX 25 CANNON BALLERS (2018091900)
  - beatmaniaIIDX 26 Rootage (2019090200)
  - beatmaniaIIDX 27 HEROIC VERSE (2020092900)
  - beatmaniaIIDX 28 BISTROVER (2021091500)
  - beatmaniaIIDX 29 CastHour (2022082400)
  - beatmaniaIIDX 30 RESIDENT (2023090500)
  - beatmaniaIIDX 31 EPOLIS (2024082600)
  - beatmaniaIIDX 32 Pinky Crush (2025082500)
  - beatmaniaIIDX 33 Sparkle Shower (2026081900)

---

Features
  - STEP UP (Sparkle Shower: the game runs it and the server keeps all of its progress; Partial on
    older versions)
  - SKILL ANALYZER
  - EVENT (Partial)
  - ARENA (LOCAL only)
  - RANDOME LANE TICKET
  - FAVORITE/SONG SELECTION NOTES
  - ORIGINAL FILTER
  - HIT CHART (Sparkle Shower, from the plays this server records)
  - CUSTOMIZE PICKERS (EPOLIS, Pinky Crush, Sparkle Shower): the Settings tab lists each version's
    own items, and each item, QPro part and entry background can be chosen from its picture after
    that version's pictures are imported on the Customize Images page (the browser reads the game's
    data/graphic folder and sends only the pictures; the plugin ships no game images)
  - MASTER AND DISCIPLE BINGO (Sparkle Shower): cards made each week from the song list, at the
    difficulty the player clears (see Difficulty Tables)

---

Difficulty Tables

data/difficulty.json is a snapshot (2026-09-27) of the players' difficulty tables below, matched
to the game's music ids; bingo cards use it to choose charts, and the Difficulty Tables page changes
ranks over it (or gives new songs one). The ranks are the work of those tables' authors and voters:
  - SP☆12 normal / hard clear reference tables ("☆12参考表"):
    https://docs.google.com/spreadsheets/d/e/2PACX-1vSUdp6iuEzE8Z5AL1hkoxzLexp89nJnLQMmICm6_MC0_UjCp1ImZFzabcZkvCpK7mcWvm_2t6iYoJRg/pubhtml
  - SP☆11 normal / hard clear difficulty table (2026-09-16), taken from the playlister category lists
    a player made of it: https://docs.google.com/spreadsheets/d/1-6Z5lfhFnRdmnrz65ulYTUgfHINgnJ90SMSPMLH2TJc/
  - SP☆9 / ☆10 normal-clear-or-under difficulty table (2026-09-05, @035sk_o):
    https://docs.google.com/spreadsheets/d/11ugU51yM8iu-8-62JO0exOwozz4HKIf8g4BIAuHEq0g/
  - SP☆10 hard clear difficulty table (tentative, 2025-03-06): https://scrapbox.io/SP10HardTable/SP_Lv10_HardTable
  - DP unofficial difficulty table (SNJ@KMZS): https://zasa.sakura.ne.jp/dp/

---

Known Issues
  - Clear Lamps may display invalid lamps due to missing conversion code
  - DJ LEVEL folders are broken before EMPRESS due to missing rank\_id
  - LEGGENDARIA play records before HEROIC VERSE may not display on higher version due to missing conversion code
  - SUPER FUTURE 2323 play records doesn't display on other version due to missing conversion code
  - ONE MORE EXTRA STAGE progress won't save (can't test this due to skill issue)
  - DOUBLE PLAY or two persons play may not work properly (can't test this due to skill issue)
  - New card cannot be registered before DistorteD (this is due to those games uses magnetic card)
  - Some of licensed songs are locked behind (kinda solved with music\_open but needs to be verified)
  - Some of badges aren't saving in RESIDENT and above (needs to figure out name to id)
  - Some of records may have invalid MISS COUNT

---

Changelogs

**v0.1.0**
  - Added Initial support for Lincle

**v0.1.1**
  - Added Initial support for HEROIC VERSE
  - Expanded score array to adapting newer difficulty (SPN ~ DPA [6] -> SPB ~ DPL [10])
    - This borked previous score datas recorded with v0.1.0
    - All score data now shared with all version
      - as it doesn't have music\_id conversion, it will display incorrect data on certain versions
  - Added Initial customize support (no webui)

**v0.1.2**
  - Added Initial support for BISTROVER
  - Added Initial Rival support (partial webui)

**v0.1.3**
  - Added Initial support for CastHour

**v0.1.4**
  - Added Initial support for RESIDENT

**v0.1.5**
  - Added Initial support for Resort Anthem
    -  LEAGUE, STORY does not work yet
  - Fixed where s\_hispeed/d\_hispeed doesn't save correctly
 
**v0.1.6**
  - Added Initial support for tricoro
    - Some of event savings are broken
  - Added movie\_upload url setting on plugin setting (BISTROVER ~)
    - This uses JSON instead of XML and this requires additional setup (can't test or implement this as I don't own NVIDIA GPU)

**v0.1.7**
  - Added Initial support for SPADA
    - Some of event savings are broken
  - Fixed where rtype didn't save correctly (BISTROVER ~)

**v0.1.8**
  - Added RIVAL pacemaker support
  - Added Initial support for PENDUAL
    - Some of event savings are broken
  - Fixed where old\_linkage\_secret\_flg is missing on pc.get response (RESIDENT)
  - Fixed where game could crash due to invalid rival qprodata
  - Fixed where lift isn't saving (SPADA)

**v0.1.9**
  - Added Initial support for copula
    - Some of event savings are broken
  - Added shop.getconvention/shop.setconvention/shop.getname/shop.savename response

**v0.1.10**
  - Added Initial support for SINOBUZ ~ Rootage
    - Converted from asphyxia\_route\_public

**v0.1.11**
  - Added Shop Ranking support
  - Changed pc.common/gameSystem.systemInfo response not to use pugFile
    - IIDX\_CPUS on models/arena.ts came from asphyxia\_route\_public

**v0.1.12**
  - Exposed some of pc.common attributes to plugin settings (WIP)
  - Added Experimental WebUI (WIP)
  - Added music.crate/music.breg response
    - CLEAR RATE and BEGINNER clear lamp may not work on certain versions
  - Added Initial support for SIRIUS
  - Fixed where Venue Top didn't save correctly (BISTROVER ~)
  - Fixed where music.appoint send empty response even rival has score data but player doesn't have score data
  - Fixed where FAVORITE may work only on specific version
  - Fixed where shop name always displayed as "CORE" instead of saved one
  - Fixed where rlist STEP UP achieve value was fixed value instead of saved one
  - Fixed where fcombo isn't saving (Resort Anthem)
  - Removed shop.savename as not working as intented

**v0.1.13**
  - Added Initial support for DJ TROOPERS
  - Added Initial support for EMPRESS
  - Fixed where EXPERT result does not display total cleared users and ranking position

**v0.1.14**
  - Added Experimental OMEGA-Attack event saving support on tricoro
  - Reworked on SINOBUZ ~ Rootage responses
  - Fixed where Base64toBuffer returns invalid value sometimes
  - Fixed where timing display option isn't saving on certain versions

**v0.1.15**
  - Added Initial support for GOLD
  - Added Disable Beginner Option
  - Added Experimental Badge saving support
  - Added Experimental score import/export
  - Fixed where plugin may fail to register due to missing types in dev mode (invalid setup for dev, just enough to get around)
  - Fixed where unable to login after first-play (SPADA, SINOBUZ, Rootage)
  - Fixed where pacemaker isn't working as intended due to malformed ghost data on music.appoint response (~ DJ TROOPERS)
  - Fixed where pacemaker isn't working as intented due to wrong condition check (HEROIC VERSE ~)
  - Fixed where pacemaker sub-type isn't load correctly (HEROIC VERSE ~)
  - Fixed where QPRO data doesn't get saved in WebUI

**v0.1.16**
  - Added Initial support for EPOLIS
  - Added music\_open on gameSystem.systemInfo response
  - Added EXTRA FAVORITE support
  - Fixed where lightning settings doesn't get saved on logout
  - Fixed where Disable Music Preview, Disable HCN Color, VEFX Lock settings doesn't reflect
  - Fixed where MISS COUNT has 0 as default (including score import)
  - Fixed where MISS COUNT doesn't get updated when exscore is same
  - Fixed where lightning model settings saved incorrectly
  - Fixed where unable to import score if user has DP scores
  - Fixed where unable to achieve dan if you failed once
  - Fixed where unable to login (tricoro, CastHour, Rootage)
  - Fixed where unable to specify rival in WebUI
  - Fixed where music.arenaCPU isn't working as intended due to change of type (EPOLIS ~)
  - Fixed where qpro head equip request handle as hand equip (@anzuwork)
  - Added error message for invalid score database entries
  - Reverted `v0.1.15` dev mode related code changes (now requires proper dev setup, refer parent README.md)
  - WebUI is now display values of corresponding version

**v0.1.17**
  - Added Initial support for Pinky Crush
  - Fixed where note\_size, lift\_cover, note\_beam\_size doesn't get saved in WebUI (EPOLIS ~)
  - Fixed STEP UP related issues
    - Unable to use STEP UP ticket
    - HARD / EX HARD folder display low level charts regardless player skill
  - Fixed HEROIC VERSE issues
    - Unable to complete registration 
    - Crash after Event room choose
  - Fixed where unable to complete registration or login (tricoro)

**v0.1.18**
  - Added Initial support for Sparkle Shower
  - Added Initial support for DistorteD, HAPPY SKY, IIDXRED, 10th Style, 9th Style
    - Requires updated version of asphyxia-core otherwise plugin won't register [v1.70b]
    - Migration from (previous version) menu will not work
      - Existing card with no current version user data will treat as new card on registration but it will use existing profile data
    - New card cannot be registered (~ HAPPY SKY)
      - Need to invoke new card registration to core.
    - 9th Style will use seperate user data database as its using raw blob
  - Added ALL/STORE/RIVAL TOP pacemaker support
  - Added basic save support of STORY mode (Resort Anthem)
  - Fixed where tricoro does not work after Asphyxia Core update
  - Fixed where unable to login after playing a while on old versions
  - Improved WebUI customization settings with descriptive dropdown menus (@COLV9)
  - Improved WebUI score viewer with song title mapping, detailed difficulty breakdown and sorting (@COLV9)
  - Sparkle Shower
    - Added HIT CHART: national / shop charts of all time, the month and the week, from every play of the
      version this server records (music.reg, music.play, music.nosave), placed by play count
    - Added MYBEST folder: each player's 20 most played songs per style
    - Added KAIDEN RANK: 14-day seasons from 2025-12-01 JST with the arcade's songs of seasons 1..21
      (BEMANIwiki), played over again from the 1st; K-ELEMENTs for a play and for every song once a season
    - Added DJ TRAINING progress: the server keeps each style's color and the Parts passed; the first color
      follows the dan (9th dan and up start at PURPLE) and a dan passed later lifts it; PURPLE's last Part
      reaches BLACK, which opens KAIDEN RANK for a KAIDEN player
    - Added WEEKLY RANKING with its rating (weeks from Wednesday 12:00 JST; the official rating formula is
      not known)
    - Added MASTER AND DISCIPLE BINGO: a MY BINGO CARD each week and a MASTERS BINGO CARD with a master, with
      charts just under what the player clears (see Difficulty Tables)
    - Added tsujigiri battle, today's pick, MY GOAL, Qpro treasure and PREMIUM FREE tickets
    - Added the tsujigiri hidden character event: 理々奈 and 彩葉 are two of each day's 3 characters (as in
      the arcade from 2026-08-20), and beating one unlocks Medicine of love LEGGENDARIA
    - Added 2 player shared settings (kept per pair of IIDX IDs)
    - Added season navi voices (Navi Voice Season: Auto by the month in Japan, or a season; its voices and
      the normal ones take turns by credit; Autumn needs 2026090900 or later)
    - Added badge slots on the profile, chosen from the badges' pictures on the Badge tab
    - Added WORLD TOURISM and DJ TRAINING settings (on by default): off, none of their folders shows, and
      DJ TRAINING off shuts KAIDEN RANK too (its progress is kept)
    - Added WEEKLY RANKING and Today's Pick settings (on by default): off, no song of the week / of the day
      (their icons, RECOMMEND, the ranking panel and the last week's result); the weekly records are kept
    - Added MASTER AND DISCIPLE BINGO setting (on by default): off, no bingo card nor BINGO CARD folder, and
      no master or disciple can be taken (the cards and counts are kept)
    - Added ARENA CPU Levels setting: the lowest and highest level of the charts the CPUs choose (when all
      the opponents are CPUs the game has them play at least the level you chose, so the highest does not
      hold then)
    - Fixed where badges the game sends were not kept (every category, the ONE MORE EXTRA badge too)
    - Fixed where WORLD TOURISM tickets, the booster reservation, RANDOM lane tickets (now 100 to start, up
      to 9999) and the entry background brightness were not kept
    - Fixed where WORLD TOURISM tours, the CYBER LOADER window, the SPARKLE FRUIT LAB last song and the
      K-ELEMENT / tsujigiri LEGGENDARIAs never came (every unlock flag was set): each reward's flag stays
      clear until it is earned while every chart stays playable, and the unlocks the game sends are kept
    - Fixed where STEP UP HARD / EX HARD started from level 0 instead of the player's scores
    - Fixed where QPro secret parts were sent short (9 values per part)
    - Fixed where EXTRA CHALLENGE data was not read (extraboss\_event / extraboss\_play)
    - Fixed where the ARENA class stayed at A1: the class, rating and records the game sends are kept, and
      a style with no ARENA play yet gets its first class from the game
  - Added Customize Images page: imports a version's pictures (customize items, QPro parts, entry
    backgrounds, badges) and song list from the game's data folder in the browser, for the customize
    pickers (EPOLIS, Pinky Crush, Sparkle Shower), the Badge tab and the features that choose songs;
    importing again replaces the pictures of the kinds sent, and the song list has its own version choice
    (data/info/1, or data/info/0 on Pinky Crush; a list of another version is refused)
  - Added Difficulty Tables page: the SP☆9..12 and DP snapshot (see Difficulty Tables), each chart's rank
    can be changed
  - Added Tsujigiri page: each day's hidden characters of the tsujigiri battle and their songs (Sparkle
    Shower)
  - Added Infinite V-DISC setting (on by default: spent V-DISC is not taken off, as before)
  - Added MISS COUNT reset on the Data tab: NO PLAY charts that show 0 (saved by plugin versions before
    2024-10) go back to ----
  - Fixed where badge flags past 2^53 were rounded
  - Fixed where clear / full combo rates showed 0%, 100% or over 100%
  - Fixed where the shop ranking's QPro had no back part
  - Fixed where a RANDOM lane ticket could get the number 5040 (valid 0..5039)
  - Fixed where the weekly activity left out today's plays
  - Fixed where the WebUI score list misnamed DP difficulties and hid DP LEGGENDARIA

**v0.1.18a**
  - Fixed where unable to login (9th Style)
  - Fixed where CYBER LOADER event data get saved incorrectly (Sparkle Shower)
  - Fixed where Entry background brightness option doesn't get saved (Sparkle Shower)
  - Fixed where classic\_hispeed option doesn't get saved on WebUI
