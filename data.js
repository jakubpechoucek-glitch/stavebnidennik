const PROJEKT = {
  nazev: "Rekonstrukce a přestavba rodinného domu – Podolanka",
  investor: "manželé Pěchoučkovi",
};

const ZAPISKY = [
  {
    id: "kd-2026-05-19",
    cislo: 1,
    datum: "2026-05-19",
    pritomni: [
      { role: "INV", jmeno: "manželé Pěchoučkovi" },
      { role: "AD", jmeno: "Ing. Arch. Jakub Žák" },
      { role: "TDI", jmeno: "Jakub Bednář" },
      { role: "TDI", jmeno: "Jan Nekola", kontakt: "737 283 324" },
      { role: "Zhotovitel", jmeno: "Michal Lohoyda" },
    ],
    prubehy: [
      "Provádí se: vyzdívání příček, montáž hrubých rozvodů ZTI",
      "Následné práce: betonáž stropu – dokončení, hydroizolace střechy, vyzdívky příček, rozvody ZTI",
      "BOZP: nutno kontrolovat zábradlí, otvory ve stropu a úklid",
    ],
    zmeny: [
      "Změna rozměrů interiérových dveří",
      "Poptat změnu světlíku",
      "Vyjasněn rozpor mezi PD ARCH a STAT ohledně použitých materiálů",
    ],
    ukoly: [
      {
        id: "3.1",
        termin: "2026-04-28",
        zodpovedny: "Zhotovitel",
        popis:
          "Předloží aktualizovaný HMG s následným postupem prací. Fáze stavby neodpovídá smluveným termínům. Nebyl splněn RPT 22.3.2026.",
        status: "trva",
      },
      {
        id: "3.3",
        termin: "2026-04-28",
        zodpovedny: "Zhotovitel",
        popis:
          "U plotu na západní straně zjištěno kanalizační vedení od sousedního objektu. Stavba probere se sousedem a zajistí vyjádření. Bude kolidovat s provedením oplocení.",
        status: "trva",
      },
      {
        id: "3.4",
        termin: "2026-04-28",
        zodpovedny: "TDI / AD",
        popis:
          "Zhotovitel se dotazoval na ukončení drenáže okolo objektu. TDI předal dotaz na AD. Drenáž bude provedena dle PD, ukončena pod opěrnou stěnou.",
        status: "splneno",
      },
      {
        id: "3.5",
        termin: "2026-04-28",
        zodpovedny: "AD",
        popis:
          "AD doplnil přesné pozice koncových prvků ZTI a elektro do pohledů. V případě nejasností zašle zhotovitel dotaz.",
        status: "splneno",
      },
      {
        id: "3.6",
        termin: "2026-05-19",
        zodpovedny: "Zhotovitel",
        popis:
          "Rozvody ZTI – kanalizace není správně provedena. Redukce musí být provedeny klasickou redukcí (nikoli zkrácenou), izolace v celém rozsahu. Materiál vodovodních rozvodů zaměněn z výrobce Viega na Concept – dodat technické parametry obou výrobců a jejich porovnání. Dále kotvení vodovodního potrubí dle TL výrobce (izolace a kotvení v objímkách).",
        status: "otevreno",
      },
    ],
  },
];
