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
          "Rozvody ZTI – kanalizace není správně provedena. Redukce musí být provedeny klasickou redukcí (nikoli zkrácenou), izolace v celém rozsahu. Materiál vodovodních rozvodů zaměněn z výrobce Viega na Concept – dodat technické parametry obou výrobců a jejich porovnání. Dále kotvení vodovodního potrubí dle TL výrobce (izolace a kotvení v objímkách). Pokud mají být v ležatém potrubí umístěny excentrické redukce, instalují se tak, aby rovný povrch redukce byl nahoře.",
        status: "otevreno",
      },
      {
        id: "3.7",
        termin: "2026-05-19",
        zodpovedny: "Zhotovitel",
        popis:
          "Otvory skrz ŽB konstrukce provádět dle PD pouze odvrty – nechat schválit.",
        status: "otevreno",
      },
      {
        id: "3.8",
        termin: "2026-06-20",
        zodpovedny: "Zhotovitel",
        popis:
          "Provede 2× vzorek omítky: štuková omítka / sádrová stěrka + malba dle zadání.",
        status: "otevreno",
      },
      {
        id: "3.9",
        termin: "2026-05-19",
        zodpovedny: "AD",
        popis:
          "AD zkonzultuje spotřebiče v kuchyňské lince pro kontrolu rozvodů voda, odpady, elektro. Zhotovitel ověří provedení na základě vybraných spotřebičů.",
        status: "otevreno",
      },
      {
        id: "3.10",
        termin: "2026-05-19",
        zodpovedny: "AD + INV",
        popis:
          "AD + INV si potvrdí povrchy – zejména koupelen, ale i ostatní. Platí PD, nebo je nějaké upřesnění?",
        status: "otevreno",
      },
      {
        id: "3.11",
        termin: "2026-05-19",
        zodpovedny: "Zhotovitel",
        popis:
          "Zhotovitel bude provádět polohy koncových prvků ZTI, UT a ELE dle PD interiéru.",
        status: "otevreno",
      },
      {
        id: "3.12",
        termin: "2026-05-19",
        zodpovedny: "Zhotovitel",
        popis:
          "Veškerá světla, která doposud nejsou provedena, budou provedena kabeláží 5×1,5.",
        status: "otevreno",
      },
      {
        id: "3.13",
        termin: "2026-05-19",
        zodpovedny: "Zhotovitel",
        popis:
          "Zhotovitel měl ověřit alternativu ke světlíku v pracovně – byla předložena pouze úspora ve stávající nabídce. Prosíme o alternativu od jiného dodavatele.",
        status: "otevreno",
      },
      {
        id: "3.14",
        termin: "2026-05-19",
        zodpovedny: "AD + INV",
        popis:
          "AD + INV vyberou odstíny fasád a strukturu, následně zhotovitel provede vzorky.",
        status: "otevreno",
      },
      {
        id: "3.15",
        termin: "2026-05-19",
        zodpovedny: "Zhotovitel",
        popis:
          "Vnitřní schody – objednávka: vyjasnit, jak je objednáno.",
        status: "otevreno",
      },
      {
        id: "3.16",
        termin: "2026-05-19",
        zodpovedny: "AD + INV",
        popis:
          "Venkovní rozvody elektro – návrh specifikace. Pro světla nutno určit minimálně okruhy, systém ovládání a pozice ovládání. Dále zásuvky pro vybavení zahrady: sekačka, závlaha, vířivka, bazén, gril aj.",
        status: "otevreno",
      },
      {
        id: "3.17",
        termin: "2026-05-19",
        zodpovedny: "Zhotovitel + AD",
        popis:
          "Zhotovitel + AD provedou kontrolu objednaných oken, zda odpovídají PD – zejména jejich rozměry a napojení na ostatní konstrukce.",
        status: "otevreno",
      },
      {
        id: "3.18",
        termin: "2026-05-19",
        zodpovedny: "Zhotovitel + AD",
        popis:
          "Zhotovitel provede na místě konzultaci s dodavatelem dveří ohledně otvorů a provede sondy pro zasekání zárubní v monolitické konstrukci, tak aby nebyla přerušena výztuž.",
        status: "otevreno",
      },
    ],
  },
];
