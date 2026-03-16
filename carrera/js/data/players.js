/**
 * @typedef {{ year: string, team: string, region: string }} CareerEntry
 * @typedef {{ name: string, position: string, hint: string, career: CareerEntry[] }} Player
 *
 * To add a player: push a new object to the array below.
 * Regions: LCK | LPL | LEC | LCS | OTHER
 */

/** @type {Player[]} */
export const PLAYERS = [
  {
    name: "Faker", position: "Mid",
    hint: "El inmortal. Considerado universalmente el mejor jugador de LoL de todos los tiempos. Tres veces Campeón Mundial con SKT/T1.",
    career: [
      { year: "2013",    team: "SK Telecom T1 2", region: "LCK" },
      { year: "2013–18", team: "SK Telecom T1",   region: "LCK" },
      { year: "2019–25", team: "T1",              region: "LCK" },
    ],
  },
  {
    name: "Uzi", position: "Bot",
    hint: "El ADC legendario chino. Conocido por su mecánica agresiva y por haber sido dos veces subcampeón mundial con Royal Never Give Up.",
    career: [
      { year: "2012–13", team: "Royal Club",           region: "LPL" },
      { year: "2014",    team: "Samsung White (Loan)",  region: "LCK" },
      { year: "2015–19", team: "Royal Never Give Up",   region: "LPL" },
    ],
  },
  {
    name: "Caps", position: "Mid",
    hint: "El Baby Faker europeo. Campeón mundial con G2 Esports en 2022 y múltiples veces campeón de la LEC.",
    career: [
      { year: "2017",    team: "Fnatic",    region: "LEC" },
      { year: "2018–25", team: "G2 Esports", region: "LEC" },
    ],
  },
  {
    name: "Bjergsen", position: "Mid",
    hint: "El rey de la LCS norteamericana durante casi una década. Jugó 8 temporadas con Team SoloMid (TSM).",
    career: [
      { year: "2013",    team: "Copenhagen Wolves", region: "LEC" },
      { year: "2014–21", team: "TSM",               region: "LCS" },
      { year: "2022",    team: "Team Liquid",        region: "LCS" },
      { year: "2023",    team: "TSM (vuelta)",       region: "LCS" },
    ],
  },
  {
    name: "Rekkles", position: "Bot",
    hint: "El ADC sueco más exitoso de Europa. Campeón de la LEC varias veces con Fnatic y G2, y medallista de plata en Mundiales.",
    career: [
      { year: "2012–14", team: "Fnatic",    region: "LEC" },
      { year: "2015–20", team: "Fnatic",    region: "LEC" },
      { year: "2021",    team: "G2 Esports", region: "LEC" },
      { year: "2022",    team: "NaVi",       region: "LEC" },
      { year: "2023–24", team: "Fnatic",    region: "LEC" },
    ],
  },
  {
    name: "TheShy", position: "Top",
    hint: "El top laner chino más agresivo. Campeón Mundial 2018 con Invictus Gaming gracias a su estilo ultraofensivo.",
    career: [
      { year: "2016",    team: "Longzhu Gaming",    region: "LCK" },
      { year: "2017–22", team: "Invictus Gaming",   region: "LPL" },
      { year: "2023",    team: "Weibo Gaming",      region: "LPL" },
      { year: "2024",    team: "NIP",               region: "LPL" },
    ],
  },
  {
    name: "Doinb", position: "Mid",
    hint: "El midlaner no convencional chino. Campeón Mundial 2019 con FunPlus Phoenix jugando campeones de utilidad en mid.",
    career: [
      { year: "2014–15", team: "Royal Never Give Up", region: "LPL" },
      { year: "2016",    team: "QG Reapers",          region: "LPL" },
      { year: "2017–18", team: "Rogue Warriors",      region: "LPL" },
      { year: "2019–21", team: "FunPlus Phoenix",     region: "LPL" },
      { year: "2022",    team: "LNG Esports",         region: "LPL" },
      { year: "2023",    team: "KT Rolster",          region: "LCK" },
      { year: "2024",    team: "FunPlus Phoenix",     region: "LPL" },
    ],
  },
  {
    name: "ShowMaker", position: "Mid",
    hint: "El midlaner coreano de alta mecánica. Campeón del Worlds 2020 con DWG KIA y conocido por su Zed y Orianna excepcionales.",
    career: [
      { year: "2019–23", team: "DAMWON Gaming / DWG KIA", region: "LCK" },
      { year: "2024",    team: "Dplus KIA",               region: "LCK" },
    ],
  },
  {
    name: "Ruler", position: "Bot",
    hint: "Campeón del Worlds 2022 con Gen.G. Es considerado uno de los mejores ADC de LCK por su consistencia y posicionamiento.",
    career: [
      { year: "2016–22", team: "Samsung Galaxy / Gen.G",    region: "LCK" },
      { year: "2023",    team: "JDG Intel Esports Club",    region: "LPL" },
      { year: "2024",    team: "Gen.G",                     region: "LCK" },
    ],
  },
  {
    name: "Deft", position: "Bot",
    hint: "Campeón del Worlds 2022 con DRX a sus 27 años en lo que fue una de las historias más emotivas de los esports.",
    career: [
      { year: "2013",    team: "CJ Entus",            region: "LCK" },
      { year: "2014–15", team: "Samsung Blue / White", region: "LCK" },
      { year: "2016",    team: "EDward Gaming",        region: "LPL" },
      { year: "2017",    team: "Samsung Galaxy",       region: "LCK" },
      { year: "2018–19", team: "kt Rolster",           region: "LCK" },
      { year: "2020–22", team: "DRX",                  region: "LCK" },
      { year: "2023",    team: "Hanwha Life",          region: "LCK" },
      { year: "2024",    team: "T1",                   region: "LCK" },
    ],
  },
  {
    name: "Chovy", position: "Mid",
    hint: "Considerado el mejor CS-er midlaner de la historia. Ha sido el jugador con más KDA en varias temporadas de LCK.",
    career: [
      { year: "2018–19", team: "Griffin", region: "LCK" },
      { year: "2020",    team: "DRX",     region: "LCK" },
      { year: "2021–25", team: "Gen.G",   region: "LCK" },
    ],
  },
  {
    name: "Perkz", position: "Mid",
    hint: "El jugador europeo más versátil. Ha jugado mid y bot, ganado múltiples LEC títulos con G2, y jugado en Cloud9 en LCS.",
    career: [
      { year: "2015–20", team: "G2 Esports",   region: "LEC" },
      { year: "2021",    team: "Cloud9",         region: "LCS" },
      { year: "2022",    team: "Vitality",       region: "LEC" },
      { year: "2023",    team: "G2 Esports",     region: "LEC" },
      { year: "2024",    team: "Karmine Corp",   region: "LEC" },
    ],
  },
  {
    name: "Jankos", position: "Jungle",
    hint: "El jungla polaco más exitoso de Europa. Ganó múltiples LEC títulos con G2 Esports, conocido por su estilo caótico y entretenido.",
    career: [
      { year: "2013",    team: "Giants Gaming",  region: "LEC" },
      { year: "2014–15", team: "Roccat",          region: "LEC" },
      { year: "2016–17", team: "H2K Gaming",      region: "LEC" },
      { year: "2018–21", team: "G2 Esports",      region: "LEC" },
      { year: "2022",    team: "Cloud9",           region: "LCS" },
      { year: "2023",    team: "Excel Esports",   region: "LEC" },
      { year: "2024",    team: "Team Heretics",   region: "LEC" },
    ],
  },
  {
    name: "Doublelift", position: "Bot",
    hint: "La estrella de la LCS norteamericana durante más de una década. Conocido tanto por su habilidad como por su personalidad carismática.",
    career: [
      { year: "2011–13", team: "Counter Logic Gaming", region: "LCS" },
      { year: "2014–17", team: "Team SoloMid",         region: "LCS" },
      { year: "2018–19", team: "Team Liquid",          region: "LCS" },
      { year: "2019–20", team: "TSM",                  region: "LCS" },
      { year: "2021",    team: "Team SoloMid",         region: "LCS" },
    ],
  },
  {
    name: "CoreJJ", position: "Support",
    hint: "Campeón del Worlds 2017 con Samsung Galaxy. Considerado uno de los mejores soportes del mundo en múltiples temporadas.",
    career: [
      { year: "2013–15", team: "Various Korean teams", region: "LCK" },
      { year: "2016",    team: "Jin Air Green Wings",  region: "LCK" },
      { year: "2017",    team: "Samsung Galaxy",       region: "LCK" },
      { year: "2018–22", team: "Team Liquid",          region: "LCS" },
      { year: "2023",    team: "Golden Guardians",     region: "LCS" },
      { year: "2024",    team: "T1",                   region: "LCK" },
    ],
  },
  {
    name: "Viper", position: "Bot",
    hint: "El ADC chino de EDG. Campeón Mundial 2021 con Edward Gaming, derrotando a DWG KIA en una de las finales más emocionantes.",
    career: [
      { year: "2019–22", team: "Edward Gaming", region: "LPL" },
      { year: "2023",    team: "Hanwha Life",   region: "LCK" },
      { year: "2024",    team: "Edward Gaming", region: "LPL" },
    ],
  },
  {
    name: "Scout", position: "Mid",
    hint: "El coreano que emigró a China. Campeón Mundial 2021 con EDG, conocido por su consistencia a lo largo de los años en LPL.",
    career: [
      { year: "2015",    team: "SKT T1 (sub)",        region: "LCK" },
      { year: "2016–22", team: "Edward Gaming",        region: "LPL" },
      { year: "2023–24", team: "JDG Intel Esports Club", region: "LPL" },
    ],
  },
  {
    name: "Knight", position: "Mid",
    hint: "El midlaner de LPL más dominante de su época. Finalista del Worlds 2023 con JDG, conocido por su agresividad en lane.",
    career: [
      { year: "2018–19", team: "Snake Esports / eStar", region: "LPL" },
      { year: "2020–21", team: "Top Esports",           region: "LPL" },
      { year: "2022–24", team: "JDG Intel Esports Club", region: "LPL" },
    ],
  },
  {
    name: "Zeus", position: "Top",
    hint: "El sucesor de Faker en T1. Campeón del Worlds 2023 y considerado el mejor top laner del mundo en 2023-2024.",
    career: [
      { year: "2021–25", team: "T1", region: "LCK" },
    ],
  },
  {
    name: "Keria", position: "Support",
    hint: "El soporte prodigio de T1. Campeón del Worlds 2023 y apodado el mejor support de la historia por muchos analistas.",
    career: [
      { year: "2020",    team: "DRX", region: "LCK" },
      { year: "2021–25", team: "T1",  region: "LCK" },
    ],
  },
  {
    name: "Smeb", position: "Top",
    hint: "El mejor top laner del mundo en 2016. Finalista del Worlds 2016 con ROX Tigers, perdiendo ante SKT T1 en semifinales épicas.",
    career: [
      { year: "2013–14", team: "CJ Entus",   region: "LCK" },
      { year: "2015",    team: "GE Tigers",  region: "LCK" },
      { year: "2016",    team: "ROX Tigers", region: "LCK" },
      { year: "2017–18", team: "kt Rolster", region: "LCK" },
      { year: "2019–20", team: "Griffin",    region: "LCK" },
    ],
  },
  {
    name: "Mata", position: "Support",
    hint: "Campeón del Worlds 2014 con Samsung White. Considerado revolucionario del rol support y uno de los mejores de la historia.",
    career: [
      { year: "2012–14", team: "Samsung White",        region: "LCK" },
      { year: "2015",    team: "Royal Never Give Up",  region: "LPL" },
      { year: "2016–18", team: "Various Korean teams", region: "LCK" },
      { year: "2019–20", team: "kt Rolster",           region: "LCK" },
    ],
  },
  {
    name: "Bang", position: "Bot",
    hint: "Dos veces Campeón Mundial con SKT T1 (2015 y 2016). Considerado un top-3 ADC histórico de la LCK.",
    career: [
      { year: "2014–18", team: "SK Telecom T1",              region: "LCK" },
      { year: "2019–20", team: "100 Thieves / Evil Geniuses", region: "LCS" },
      { year: "2021–22", team: "KT Rolster",                  region: "LCK" },
    ],
  },
  {
    name: "Rookie", position: "Mid",
    hint: "Campeón Mundial 2018 con Invictus Gaming. Dejó LCK para dominar la LPL y es considerado el mejor import coreano en China.",
    career: [
      { year: "2013",    team: "SKT T1 S (sub)",  region: "LCK" },
      { year: "2014",    team: "CJ Entus",         region: "LCK" },
      { year: "2015–22", team: "Invictus Gaming",  region: "LPL" },
      { year: "2023",    team: "Weibo Gaming",     region: "LPL" },
    ],
  },
  {
    name: "Tian", position: "Jungle",
    hint: "Campeón Mundial 2019 con FunPlus Phoenix. Conocido por su agresividad en early game y sus mecánicas de Olaf.",
    career: [
      { year: "2018–21", team: "FunPlus Phoenix", region: "LPL" },
      { year: "2022",    team: "Cloud9",           region: "LCS" },
      { year: "2023",    team: "Weibo Gaming",    region: "LPL" },
    ],
  },
  {
    name: "Meiko", position: "Support",
    hint: "El soporte icónico de EDG. Ha pasado toda su carrera con Edward Gaming siendo el support más leal de la LPL.",
    career: [
      { year: "2014–24", team: "Edward Gaming", region: "LPL" },
    ],
  },
  {
    name: "Wunder", position: "Top",
    hint: "El top laner danés de G2. Múltiples veces campeón de la LEC, conocido por su piscine de campeones y su shotcalling.",
    career: [
      { year: "2016–17", team: "Splyce",       region: "LEC" },
      { year: "2018–21", team: "G2 Esports",   region: "LEC" },
      { year: "2022–23", team: "Cloud9 / NRG", region: "LCS" },
      { year: "2024",    team: "G2 Esports",   region: "LEC" },
    ],
  },
  {
    name: "Jensen", position: "Mid",
    hint: "El midlaner danés que se convirtió en pilar de la LCS. Ha competido en Worlds con C9 y Team Liquid múltiples veces.",
    career: [
      { year: "2015–17", team: "Cloud9",       region: "LCS" },
      { year: "2018–20", team: "Team Liquid",  region: "LCS" },
      { year: "2021",    team: "Cloud9",       region: "LCS" },
      { year: "2022–24", team: "Team Liquid",  region: "LCS" },
    ],
  },
  {
    name: "Sneaky", position: "Bot",
    hint: "El ADC icónico de Cloud9. Pasó casi toda su carrera con C9 y es recordado por sus cosplays fuera del juego.",
    career: [
      { year: "2013–19", team: "Cloud9", region: "LCS" },
    ],
  },
  {
    name: "xPeke", position: "Mid",
    hint: "La leyenda europea. Su backdoor con Kassadin contra SK Gaming en 2013 es uno de los momentos más icónicos de LoL esports.",
    career: [
      { year: "2011–14", team: "Fnatic",          region: "LEC" },
      { year: "2015–17", team: "Origen (fundador)", region: "LEC" },
    ],
  },
  {
    name: "sOAZ", position: "Top",
    hint: "El top laner más longevo de Europa. Pasó muchos años en Fnatic y Origen siendo un pilar del equipo europeo.",
    career: [
      { year: "2011–13", team: "Fnatic",          region: "LEC" },
      { year: "2014",    team: "Fnatic",          region: "LEC" },
      { year: "2015–16", team: "Origen",          region: "LEC" },
      { year: "2017–18", team: "Fnatic",          region: "LEC" },
      { year: "2019",    team: "Misfits Gaming",  region: "LEC" },
    ],
  },
  {
    name: "Pray", position: "Bot",
    hint: "Finalista del Worlds 2016 con ROX Tigers. Conocido por su dúo legendario con Gorilla y su consistencia en LCK.",
    career: [
      { year: "2013–14", team: "NaJin White Shield", region: "LCK" },
      { year: "2015",    team: "GE Tigers",          region: "LCK" },
      { year: "2016",    team: "ROX Tigers",         region: "LCK" },
      { year: "2017–18", team: "kt Rolster",         region: "LCK" },
    ],
  },
  {
    name: "Gorilla", position: "Support",
    hint: "La otra mitad del dúo Pray-Gorilla. Finalista del Worlds 2016, ganó el campeonato mundial más tarde como coach con Gen.G.",
    career: [
      { year: "2013–14", team: "NaJin White Shield",  region: "LCK" },
      { year: "2015",    team: "GE Tigers",           region: "LCK" },
      { year: "2016",    team: "ROX Tigers",          region: "LCK" },
      { year: "2017",    team: "kt Rolster",          region: "LCK" },
      { year: "2018",    team: "Royal Never Give Up", region: "LPL" },
    ],
  },
  {
    name: "Piglet", position: "Bot",
    hint: "Campeón del Worlds 2013 con SKT T1. Fue el primer ADC coreano en competir en la LCS norteamericana.",
    career: [
      { year: "2012–13", team: "SK Telecom T1",    region: "LCK" },
      { year: "2014",    team: "Team Liquid",       region: "LCS" },
      { year: "2015–18", team: "Various NA teams",  region: "LCS" },
    ],
  },
  {
    name: "Peanut", position: "Jungle",
    hint: "Campeón del Worlds 2017 con Samsung Galaxy. Pasó por SKT, ROX, KT y más equipos, siendo muy versátil.",
    career: [
      { year: "2015",    team: "ROX Tigers",     region: "LCK" },
      { year: "2016",    team: "ROX Tigers",     region: "LCK" },
      { year: "2017",    team: "SK Telecom T1",  region: "LCK" },
      { year: "2017",    team: "Samsung Galaxy", region: "LCK" },
      { year: "2018–20", team: "kt Rolster / others", region: "LCK" },
    ],
  },
  {
    name: "Huni", position: "Top",
    hint: "El top laner finlandés conocido por su estilo agresivo y poco ortodoxo. Jugó en Fnatic, SKT, y varias ligas.",
    career: [
      { year: "2015",    team: "Fnatic",                    region: "LEC" },
      { year: "2016",    team: "Immortals",                 region: "LCS" },
      { year: "2017",    team: "SK Telecom T1",             region: "LCK" },
      { year: "2018–19", team: "Clutch Gaming / Echo Fox",  region: "LCS" },
      { year: "2020",    team: "Dignitas",                  region: "LCS" },
    ],
  },
  {
    name: "Ambition", position: "Jungle",
    hint: "Campeón del Worlds 2017 con Samsung Galaxy. Empezó como midlaner y se convirtió en uno de los mejores junglas de LCK.",
    career: [
      { year: "2012–13", team: "CJ Entus (Mid)",        region: "LCK" },
      { year: "2014",    team: "Samsung Blue (Mid)",     region: "LCK" },
      { year: "2015–17", team: "Samsung Galaxy (Jungle)", region: "LCK" },
      { year: "2018",    team: "Gen.G (Jungle)",         region: "LCK" },
    ],
  },
  {
    name: "Broxah", position: "Jungle",
    hint: "El jungla danés de Fnatic. Llevó a Fnatic a la final del Worlds 2018 y después jugó en Team Liquid en LCS.",
    career: [
      { year: "2017–19", team: "Fnatic",                        region: "LEC" },
      { year: "2020",    team: "Team Liquid",                   region: "LCS" },
      { year: "2021–22", team: "CLG / Counter Logic Gaming",    region: "LCS" },
    ],
  },
  {
    name: "Mikyx", position: "Support",
    hint: "El soporte esloveno de G2. Múltiples veces campeón de la LEC, conocido por su Nautilus y sus jugadas de iniciación.",
    career: [
      { year: "2017",    team: "Splyce",        region: "LEC" },
      { year: "2018",    team: "Misfits Gaming", region: "LEC" },
      { year: "2019–21", team: "G2 Esports",    region: "LEC" },
      { year: "2022",    team: "Excel Esports", region: "LEC" },
      { year: "2023–24", team: "G2 Esports",    region: "LEC" },
    ],
  },
  {
    name: "Zven", position: "Bot",
    hint: "El ADC danés que jugó en G2 y luego se fue a LCS con TSM y C9. Conocido por su precisión en teamfights.",
    career: [
      { year: "2015",    team: "Elements / SK Gaming", region: "LEC" },
      { year: "2016–17", team: "G2 Esports",           region: "LEC" },
      { year: "2018–19", team: "TSM",                  region: "LCS" },
      { year: "2020–22", team: "Cloud9",               region: "LCS" },
    ],
  },
  {
    name: "Bwipo", position: "Top",
    hint: "El top laner belga de Fnatic y posteriormente TL. Conocido por su enorme piscine y su estilo de juego hipercarry.",
    career: [
      { year: "2018–21", team: "Fnatic",      region: "LEC" },
      { year: "2022",    team: "Team Liquid", region: "LCS" },
      { year: "2023",    team: "NRG Esports", region: "LCS" },
      { year: "2024",    team: "Fnatic",      region: "LEC" },
    ],
  },
  {
    name: "Karsa", position: "Jungle",
    hint: "El jungla taiwanés que dominó la LPL con Royal Never Give Up y ganó reconocimiento mundial por su Olaf y Lee Sin.",
    career: [
      { year: "2014–15", team: "Flash Wolves",        region: "OTHER" },
      { year: "2016–17", team: "Flash Wolves",        region: "OTHER" },
      { year: "2018–20", team: "Royal Never Give Up", region: "LPL"   },
      { year: "2021",    team: "Top Esports",         region: "LPL"   },
    ],
  },
  {
    name: "Xiaohu", position: "Mid",
    hint: "El midlaner estrella de RNG. Dos veces finalista del Worlds con Royal Never Give Up y luego jugó como top laner.",
    career: [
      { year: "2015–22", team: "Royal Never Give Up",  region: "LPL" },
      { year: "2023",    team: "JDG Intel Esports Club", region: "LPL" },
    ],
  },
  {
    name: "369", position: "Top",
    hint: "El top laner de JDG. Finalista del Worlds 2023, conocido por su versatilidad para jugar tanto carries como tanks.",
    career: [
      { year: "2019–20", team: "JDG Intel Esports Club", region: "LPL" },
      { year: "2021",    team: "Top Esports",            region: "LPL" },
      { year: "2022–24", team: "JDG Intel Esports Club", region: "LPL" },
    ],
  },
  {
    name: "Oner", position: "Jungle",
    hint: "El jungla de T1. Campeón del Worlds 2023 y reconocido por su agresividad en early game y su sinergia con Faker.",
    career: [
      { year: "2022–25", team: "T1", region: "LCK" },
    ],
  },
  {
    name: "Gumayusi", position: "Bot",
    hint: "El ADC de T1. Campeón del Worlds 2023, conocido por su mecánica excepcional en Tristana y Ezreal.",
    career: [
      { year: "2020–25", team: "T1", region: "LCK" },
    ],
  },
  {
    name: "Clearlove", position: "Jungle",
    hint: "El jungla de EDG durante años. Uno de los junglas más icónicos de la LPL, conocido por su Jarvan y Evelynn.",
    career: [
      { year: "2012–14", team: "Various LPL teams", region: "LPL" },
      { year: "2015–19", team: "Edward Gaming",     region: "LPL" },
    ],
  },
  {
    name: "Ming", position: "Support",
    hint: "El soporte de RNG. Campeón del MSI 2018 junto a Uzi, conocido por su Tahm Kench y sus salvadas imposibles.",
    career: [
      { year: "2016–22", team: "Royal Never Give Up", region: "LPL" },
      { year: "2023",    team: "Bilibili Gaming",     region: "LPL" },
    ],
  },
  {
    name: "Jiejie", position: "Jungle",
    hint: "El jungla de EDG que ganó el Worlds 2021. Conocido por su Lee Sin y su capacidad para generar ventaja en early.",
    career: [
      { year: "2019–23", team: "Edward Gaming", region: "LPL" },
      { year: "2024",    team: "BLG",           region: "LPL" },
    ],
  },
  {
    name: "Clid", position: "Jungle",
    hint: "Campeón del Worlds 2019 con SKT T1. El jungla coreano que fue parte del equipo de Faker en su regreso al trono.",
    career: [
      { year: "2019",    team: "SK Telecom T1",       region: "LCK" },
      { year: "2020–21", team: "KT Rolster",          region: "LCK" },
      { year: "2022",    team: "JDG Intel Esports Club", region: "LPL" },
    ],
  },
  {
    name: "Wolf", position: "Support",
    hint: "Dos veces Campeón Mundial con SKT T1 (2015, 2016). El soporte silencioso que complementó perfectamente a Bang.",
    career: [
      { year: "2014–18", team: "SK Telecom T1",  region: "LCK" },
      { year: "2019",    team: "Longzhu / KSV",  region: "LCK" },
    ],
  },
  {
    name: "Teddy", position: "Bot",
    hint: "El ADC de T1/SKT. Conocido como el sucesor de Bang, fue una pieza clave del equipo junto a Faker en 2019.",
    career: [
      { year: "2017–18", team: "Jin Air Green Wings",    region: "LCK" },
      { year: "2019–23", team: "T1 / SK Telecom T1",    region: "LCK" },
      { year: "2024",    team: "Nongshim RedForce",      region: "LCK" },
    ],
  },
  {
    name: "Svenskeren", position: "Jungle",
    hint: "El jungla danés de SKT, TSM y más. Conocido por su Gragas y por su paso por múltiples equipos top de LCK y LCS.",
    career: [
      { year: "2013–15", team: "SK Gaming",              region: "LEC" },
      { year: "2016–17", team: "TSM",                    region: "LCS" },
      { year: "2018",    team: "SK Telecom T1",          region: "LCK" },
      { year: "2019–20", team: "Cloud9 / Evil Geniuses", region: "LCS" },
    ],
  },
  {
    name: "Impact", position: "Top",
    hint: "Campeón del Worlds 2013 con SKT T1. Emigró a LCS con Team Liquid y se convirtió en un referente top laner de NA.",
    career: [
      { year: "2012–13", team: "SK Telecom T1",        region: "LCK" },
      { year: "2014–19", team: "Team Liquid / others", region: "LCS" },
      { year: "2020–23", team: "100 Thieves",          region: "LCS" },
    ],
  },
  {
    name: "Xmithie", position: "Jungle",
    hint: "El jungla de Team Liquid que llegó a semifinales del Worlds 2018. Conocido por su shotcalling y visión control.",
    career: [
      { year: "2012–16", team: "Counter Logic Gaming", region: "LCS" },
      { year: "2017–19", team: "Team Liquid",          region: "LCS" },
      { year: "2020",    team: "Immortals",            region: "LCS" },
    ],
  },
  {
    name: "Nemesis", position: "Mid",
    hint: "El midlaner esloveno de Fnatic. Llevó a Fnatic a semifinales del Worlds 2019 con su Ryze y TF.",
    career: [
      { year: "2019–20", team: "Fnatic",         region: "LEC" },
      { year: "2021",    team: "Team Vitality",  region: "LEC" },
      { year: "2022",    team: "FL Esports",     region: "LPL" },
    ],
  },
  {
    name: "Ryu", position: "Mid",
    hint: "El midlaner coreano famoso por su duelo épico contra Faker con Zed en 2013, considerado el mejor 1v1 de la historia de LoL.",
    career: [
      { year: "2012–14", team: "KT Rolster Bullets", region: "LCK" },
      { year: "2015–16", team: "H2K Gaming",         region: "LEC" },
      { year: "2017–18", team: "Phoenix1 / 100 Thieves", region: "LCS" },
    ],
  },
  {
    name: "Bengi", position: "Jungle",
    hint: "El jungla sombra de Faker. Tres veces campeón mundial con SKT T1 (2013, 2015, 2016). Su estilo pasivo y de servicio al equipo lo convirtió en leyenda.",
    career: [
      { year: "2013",    team: "SKT T1 K", region: "LCK" },
      { year: "2014",    team: "SKT T1 K", region: "LCK" },
      { year: "2015–16", team: "SKT T1",   region: "LCK" },
      { year: "2017",    team: "SKT T1",   region: "LCK" },
    ],
  },
  {
    name: "MaRin", position: "Top",
    hint: "Top laner coreano campeón del mundo con SKT T1 en 2015. Considerado el mejor top de su época, destacó por su agresividad y dominio del split push.",
    career: [
      { year: "2013",    team: "CJ Entus Blaze", region: "LCK" },
      { year: "2014",    team: "KT Rolster",     region: "LCK" },
      { year: "2015",    team: "SKT T1",         region: "LCK" },
      { year: "2016",    team: "Qiao Gu",        region: "LPL" },
      { year: "2017",    team: "Team WE",        region: "LPL" },
    ],
  },
  {
    name: "Madlife", position: "Support",
    hint: "El support coreano más icónico de la era dorada del LoL. Sus hooks de Blitzcrank y Thresh eran de otro nivel. Jugó casi toda su carrera en CJ Entus.",
    career: [
      { year: "2012–13", team: "CJ Entus Blaze", region: "LCK" },
      { year: "2014–15", team: "CJ Entus Blaze", region: "LCK" },
      { year: "2016",    team: "CJ Entus",       region: "LCK" },
      { year: "2017",    team: "Gold Coin United", region: "LCS" },
    ],
  },
  {
    name: "InSec", position: "Jungle",
    hint: "El jungla coreano que dio nombre al 'InSec', la jugada de Flash+Lee Sin kick. Conocido por su mecánica excepcional y su paso por NaJin y KT Rolster.",
    career: [
      { year: "2012–13", team: "NaJin Sword",  region: "LCK" },
      { year: "2014–15", team: "KT Rolster",   region: "LCK" },
      { year: "2016",    team: "KT Rolster",   region: "LCK" },
      { year: "2017",    team: "Longzhu",      region: "LCK" },
    ],
  },
  {
    name: "DanDy", position: "Jungle",
    hint: "El jungla de Samsung White, campeón mundial en 2014. Considerado por muchos el mejor jungla de la historia del LoL por su dominio en Worlds 2014.",
    career: [
      { year: "2013",    team: "Samsung Ozone", region: "LCK" },
      { year: "2014",    team: "Samsung White", region: "LCK" },
      { year: "2015–16", team: "Team WE",       region: "LPL" },
      { year: "2017",    team: "Vici Gaming",   region: "LPL" },
    ],
  },
  {
    name: "Dyrus", position: "Top",
    hint: "El top laner más querido de Norteamérica. Jugó 5 Worlds consecutivos con TSM (2011–2015) y fue el rostro del esports de LoL en NA durante años.",
    career: [
      { year: "2011",    team: "TSM", region: "LCS" },
      { year: "2012",    team: "TSM", region: "LCS" },
      { year: "2013",    team: "TSM", region: "LCS" },
      { year: "2014",    team: "TSM", region: "LCS" },
      { year: "2015",    team: "TSM", region: "LCS" },
    ],
  },
  {
    name: "Hai", position: "Mid",
    hint: "Co-fundador y alma de Cloud9. Lideró al equipo desde el Mid hasta moverse al Support. Una de las figuras más carismáticas del esports de NA.",
    career: [
      { year: "2012–13", team: "Cloud9",   region: "LCS" },
      { year: "2014–15", team: "Cloud9",   region: "LCS" },
      { year: "2016",    team: "Cloud9",   region: "LCS" },
      { year: "2017",    team: "FlyQuest", region: "LCS" },
    ],
  },
  {
    name: "Froggen", position: "Mid",
    hint: "El mejor midlaner europeo antes de la era de los coreanos. Su Anivia era legendaria. Jugó para CLG EU, Alliance y luego en NA con Echo Fox.",
    career: [
      { year: "2012",    team: "CLG EU",    region: "LEC" },
      { year: "2013–14", team: "Alliance",  region: "LEC" },
      { year: "2015",    team: "Elements",  region: "LEC" },
      { year: "2017–18", team: "Echo Fox",  region: "LCS" },
    ],
  },
];
