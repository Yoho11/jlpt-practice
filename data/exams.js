// Answer keys for each exam.
// Each mondai is [mondaiNumber, answers, category, flags?]
//   answers: one character per question, "1"-"4" = correct choice, "?" = no key available (ungraded)
//   category: vocab | grammar | reading | listening
//   flags: "u" = unofficial answers (no published key in the source files; solved by hand)
//   disputed: { questionId: suggestedAnswer } = the key digit is probably wrong; shown with a warning in feedback/review
// listeningPage: booklet page where the 聴解 section starts (booklet jumps there on the 聴解 tab).
// Parts with continuous: true number questions continuously across mondai (as printed in the booklet);
// otherwise numbering restarts at 1 in every mondai (listening).

const N2_PARTS = (gengo, choukai) => [
  { key: "gengo", name: "言語知識（文字・語彙・文法）・読解", short: "言語知識・読解", minutes: 105, continuous: true, mondai: gengo },
  { key: "choukai", name: "聴解", short: "聴解", minutes: 50, continuous: false, listening: true, mondai: choukai },
];

const N3_PARTS = (moji, bunpou, choukai) => [
  { key: "moji", name: "言語知識（文字・語彙）", short: "文字・語彙", minutes: 30, continuous: true, mondai: moji },
  { key: "bunpou", name: "言語知識（文法）・読解", short: "文法・読解", minutes: 70, continuous: true, mondai: bunpou },
  { key: "choukai", name: "聴解", short: "聴解", minutes: 40, continuous: false, listening: true, mondai: choukai },
];

window.EXAMS = [
  // ───────────────────────── N2 ─────────────────────────
  {
    id: "n2-2021-07", level: "N2", year: 2021, month: 7, pages: 33, listeningPage: 25,
    notes: [
      "読解 questions 52–72 have no published key in the source files. Their answers were worked out by hand, so treat them as unofficial (marked †).",
    ],
    parts: N2_PARTS(
      [
        [1, "43124", "vocab"], [2, "11234", "vocab"], [3, "331", "vocab"], [4, "4324121", "vocab"],
        [5, "12434", "vocab"], [6, "34213", "vocab"],
        [7, "132241213443", "grammar"], [8, "13424", "grammar"], [9, "1312", "grammar"],
        [10, "23121", "reading", "u"], [11, "344122412", "reading", "u"], [12, "43", "reading", "u"],
        [13, "313", "reading", "u"], [14, "23", "reading", "u"],
      ],
      [
        [1, "44233", "listening"], [2, "423114", "listening"], [3, "24313", "listening"],
        [4, "12223332111", "listening"], [5, "123", "listening"],
      ]
    ),
  },
  {
    id: "n2-2020-12", level: "N2", year: 2020, month: 12, pages: 17, listeningPage: 15,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "23431", "vocab"], [2, "13421", "vocab"], [3, "314", "vocab"], [4, "2143234", "vocab"],
        [5, "14132", "vocab"], [6, "24321", "vocab"],
        [7, "314214232314", "grammar"], [8, "42412", "grammar"], [9, "3134", "grammar"],
        [10, "23211", "reading"], [11, "413321334", "reading"], [12, "24", "reading"],
        [13, "141", "reading"], [14, "43", "reading"],
      ],
      [
        [1, "32432", "listening"], [2, "423412", "listening"], [3, "13433", "listening"],
        [4, "22312231311", "listening"], [5, "334", "listening"],
      ]
    ),
  },
  {
    id: "n2-2019-12", level: "N2", year: 2019, month: 12, pages: 14, listeningPage: 13,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "21443", "vocab"], [2, "42311", "vocab"], [3, "314", "vocab"], [4, "2113243", "vocab"],
        [5, "32341", "vocab"], [6, "42231", "vocab"],
        [7, "213324422341", "grammar"], [8, "31442", "grammar"], [9, "32413", "grammar"],
        [10, "23433", "reading"], [11, "12312142", "reading"], [12, "43", "reading"],
        [13, "142", "reading"], [14, "32", "reading"],
      ],
      [
        [1, "21424", "listening"], [2, "12432", "listening"], [3, "12443", "listening"],
        [4, "21213121323", "listening"], [5, "1142", "listening"],
      ]
    ),
  },
  {
    id: "n2-2019-07", level: "N2", year: 2019, month: 7, pages: 14, listeningPage: 13,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "42321", "vocab"], [2, "14332", "vocab"], [3, "142", "vocab"], [4, "2134241", "vocab"],
        [5, "33241", "vocab"], [6, "41432", "vocab"],
        [7, "442331213432", "grammar"], [8, "31421", "grammar"], [9, "41321", "grammar"],
        [10, "22431", "reading"], [11, "421414133", "reading"], [12, "32", "reading"],
        [13, "421", "reading"], [14, "23", "reading"],
      ],
      [
        [1, "43413", "listening"], [2, "43322", "listening"], [3, "22413", "listening"],
        [4, "12233113321", "listening"], [5, "2421", "listening"],
      ]
    ),
  },
  {
    id: "n2-2018-12", level: "N2", year: 2018, month: 12, pages: 14, listeningPage: 13,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "12234", "vocab"], [2, "32143", "vocab"], [3, "312", "vocab"], [4, "1422314", "vocab"],
        [5, "13244", "vocab"], [6, "34413", "vocab"],
        [7, "234131132143", "grammar"], [8, "21324", "grammar"], [9, "33142", "grammar"],
        [10, "24113", "reading"], [11, "324413221", "reading"], [12, "41", "reading"],
        [13, "423", "reading"], [14, "33", "reading"],
      ],
      [
        [1, "41312", "listening"], [2, "23142", "listening"], [3, "11342", "listening"],
        [4, "21321213233", "listening"], [5, "2424", "listening"],
      ]
    ),
  },
  {
    id: "n2-2018-07", level: "N2", year: 2018, month: 7, pages: 16, listeningPage: 15,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "43231", "vocab"], [2, "34123", "vocab"], [3, "24341", "vocab"], [4, "4324121", "vocab"],
        [5, "13421", "vocab"], [6, "41223", "vocab"],
        [7, "322414343214", "grammar"], [8, "22143", "grammar"], [9, "13142", "grammar"],
        [10, "24134", "reading"], [11, "341421213", "reading"], [12, "13", "reading"],
        [13, "432", "reading"], [14, "32", "reading"],
      ],
      [
        [1, "32214", "listening"], [2, "31314", "listening"], [3, "13213", "listening"],
        [4, "31232111213", "listening"], [5, "2421", "listening"],
      ]
    ),
  },
  {
    id: "n2-2017-12", level: "N2", year: 2017, month: 12, pages: 16, listeningPage: 15,
    disputed: { "0-14-74": 4 }, // key says 2 (B) but the poster supports 4 (D)
    notes: [],
    parts: N2_PARTS(
      [
        [1, "13422", "vocab"], [2, "32413", "vocab"], [3, "44213", "vocab"], [4, "1123424", "vocab"],
        [5, "31123", "vocab"], [6, "24413", "vocab"],
        [7, "412113314332", "grammar"], [8, "14421", "grammar"], [9, "24231", "grammar"],
        [10, "24132", "reading"], [11, "224143413", "reading"], [12, "43", "reading"],
        [13, "312", "reading"], [14, "23", "reading"],
      ],
      [
        [1, "41342", "listening"], [2, "212412", "listening"], [3, "13412", "listening"],
        [4, "223213123231", "listening"], [5, "3223", "listening"],
      ]
    ),
  },
  {
    id: "n2-2017-07", level: "N2", year: 2017, month: 7, pages: 16, listeningPage: 15,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "32214", "vocab"], [2, "12313", "vocab"], [3, "42243", "vocab"], [4, "4241313", "vocab"],
        [5, "44213", "vocab"], [6, "24113", "vocab"],
        [7, "431241224321", "grammar"], [8, "14432", "grammar"], [9, "21341", "grammar"],
        [10, "32311", "reading"], [11, "443412241", "reading"], [12, "14", "reading"],
        [13, "322", "reading"], [14, "33", "reading"],
      ],
      [
        [1, "12232", "listening"], [2, "333123", "listening"], [3, "44321", "listening"],
        [4, "311232321222", "listening"], [5, "1124", "listening"],
      ]
    ),
  },
  {
    id: "n2-2016-12", level: "N2", year: 2016, month: 12, pages: 16, listeningPage: 15,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "24231", "vocab"], [2, "23214", "vocab"], [3, "13341", "vocab"], [4, "2132314", "vocab"],
        [5, "14342", "vocab"], [6, "34142", "vocab"],
        [7, "112314223434", "grammar"], [8, "34123", "grammar"], [9, "22413", "grammar"],
        [10, "23421", "reading"], [11, "131412231", "reading"], [12, "43", "reading"],
        [13, "243", "reading"], [14, "43", "reading"],
      ],
      [
        [1, "12243", "listening"], [2, "321241", "listening"], [3, "21312", "listening"],
        [4, "232131222113", "listening"], [5, "3131", "listening"],
      ]
    ),
  },
  {
    id: "n2-2016-07", level: "N2", year: 2016, month: 7, pages: 17, listeningPage: 16,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "41432", "vocab"], [2, "32142", "vocab"], [3, "41332", "vocab"], [4, "2141234", "vocab"],
        [5, "41132", "vocab"], [6, "23341", "vocab"],
        [7, "132142244313", "grammar"], [8, "14213", "grammar"], [9, "21432", "grammar"],
        [10, "23241", "reading"], [11, "413421124", "reading"], [12, "23", "reading"],
        [13, "314", "reading"], [14, "34", "reading"],
      ],
      [
        [1, "23321", "listening"], [2, "333432", "listening"], [3, "41213", "listening"],
        [4, "322121123323", "listening"], [5, "3334", "listening"],
      ]
    ),
  },
  {
    id: "n2-2015-12", level: "N2", year: 2015, month: 12, pages: 17, listeningPage: 16,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "31423", "vocab"], [2, "14123", "vocab"], [3, "24431", "vocab"], [4, "1312342", "vocab"],
        [5, "41243", "vocab"], [6, "23241", "vocab"],
        [7, "143232113124", "grammar"], [8, "43132", "grammar"], [9, "21324", "grammar"],
        [10, "33213", "reading"], [11, "243314241", "reading"], [12, "14", "reading"],
        [13, "324", "reading"], [14, "42", "reading"],
      ],
      [
        [1, "41243", "listening"], [2, "231232", "listening"], [3, "34223", "listening"],
        [4, "323123132223", "listening"], [5, "4342", "listening"],
      ]
    ),
  },
  {
    id: "n2-2015-07", level: "N2", year: 2015, month: 7, pages: 17, listeningPage: 16,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "41432", "vocab"], [2, "13341", "vocab"], [3, "42132", "vocab"], [4, "4323142", "vocab"],
        [5, "31432", "vocab"], [6, "31421", "vocab"],
        [7, "142324133342", "grammar"], [8, "12341", "grammar"], [9, "13142", "grammar"],
        [10, "34412", "reading"], [11, "442121341", "reading"], [12, "33", "reading"],
        [13, "432", "reading"], [14, "32", "reading"],
      ],
      [
        [1, "33233", "listening"], [2, "241232", "listening"], [3, "13244", "listening"],
        [4, "313221313122", "listening"], [5, "3112", "listening"],
      ]
    ),
  },
  {
    id: "n2-2014-12", level: "N2", year: 2014, month: 12, pages: 17, listeningPage: 16,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "34212", "vocab"], [2, "24331", "vocab"], [3, "41323", "vocab"], [4, "1421143", "vocab"],
        [5, "42413", "vocab"], [6, "23131", "vocab"],
        [7, "413431241324", "grammar"], [8, "21433", "grammar"], [9, "31234", "grammar"],
        [10, "43141", "reading"], [11, "244341132", "reading"], [12, "23", "reading"],
        [13, "234", "reading"], [14, "22", "reading"],
      ],
      [
        [1, "12423", "listening"], [2, "223243", "listening"], [3, "43342", "listening"],
        [4, "313211321223", "listening"], [5, "3242", "listening"],
      ]
    ),
  },
  {
    id: "n2-2014-07", level: "N2", year: 2014, month: 7, pages: 17, listeningPage: 16,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "12314", "vocab"], [2, "44123", "vocab"], [3, "13424", "vocab"], [4, "3132214", "vocab"],
        [5, "22134", "vocab"], [6, "32143", "vocab"],
        [7, "423241311342", "grammar"], [8, "11234", "grammar"], [9, "14223", "grammar"],
        [10, "43141", "reading"], [11, "421322243", "reading"], [12, "41", "reading"],
        [13, "421", "reading"], [14, "33", "reading"],
      ],
      [
        [1, "44333", "listening"], [2, "234132", "listening"], [3, "12142", "listening"],
        [4, "122233212132", "listening"], [5, "2313", "listening"],
      ]
    ),
  },
  {
    id: "n2-2013-12", level: "N2", year: 2013, month: 12, pages: 17, listeningPage: 16,
    notes: [],
    parts: N2_PARTS(
      [
        [1, "41341", "vocab"], [2, "24314", "vocab"], [3, "32421", "vocab"], [4, "4132123", "vocab"],
        [5, "34124", "vocab"], [6, "24231", "vocab"],
        [7, "443132332112", "grammar"], [8, "14324", "grammar"], [9, "12243", "grammar"],
        [10, "11422", "reading"], [11, "431124313", "reading"], [12, "14", "reading"],
        [13, "332", "reading"], [14, "34", "reading"],
      ],
      [
        [1, "14123", "listening"], [2, "332234", "listening"], [3, "42314", "listening"],
        [4, "312213231333", "listening"], [5, "2313", "listening"],
      ]
    ),
  },

  // ───────────────────────── N3 ─────────────────────────
  {
    id: "n3-2021-07", level: "N3", year: 2021, month: 7, pages: 30, listeningPage: 20,
    disputed: { "0-3-24": 4, "1-1-10": 1 }, // key says 2 for both; 4 (ぺらぺら) and 1 (優勝しても不思議ではない) fit
    notes: [
      "The source files have no answer key for 聴解, so you can practise it with the audio but it is not graded.",
    ],
    parts: N3_PARTS(
      [
        [1, "42241313", "vocab"], [2, "323142", "vocab"], [3, "34324231221", "vocab"],
        [4, "32414", "vocab"], [5, "21413", "vocab"],
      ],
      [
        [1, "3442131432322", "grammar"], [2, "24131", "grammar"], [3, "3124", "grammar"],
        [4, "3312", "reading"], [5, "342413", "reading"], [6, "4412", "reading"], [7, "31", "reading"],
      ],
      [
        [1, "??????", "listening"], [2, "??????", "listening"], [3, "???", "listening"],
        [4, "????", "listening"], [5, "?????????", "listening"],
      ]
    ),
  },
  {
    id: "n3-2020-12", level: "N3", year: 2020, month: 12, pages: 11,
    notes: [
      "The source files have no 聴解 question booklet. Use the audio and mark 1–4 on the answer sheet; picture questions can't be seen.",
    ],
    parts: N3_PARTS(
      [
        [1, "13243421", "vocab"], [2, "323414", "vocab"], [3, "43213144123", "vocab"],
        [4, "43112", "vocab"], [5, "23124", "vocab"],
      ],
      [
        [1, "2143133241241", "grammar"], [2, "13234", "grammar"], [3, "4123", "grammar"],
        [4, "4332", "reading"], [5, "341124", "reading"], [6, "2133", "reading"], [7, "14", "reading"],
      ],
      [
        [1, "234234", "listening"], [2, "324423", "listening"], [3, "142", "listening"],
        [4, "2231", "listening"], [5, "232312312", "listening"],
      ]
    ),
  },
  {
    id: "n3-2019-12", level: "N3", year: 2019, month: 12, pages: 17, listeningPage: 14,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "24123141", "vocab"], [2, "434312", "vocab"], [3, "32311424324", "vocab"],
        [4, "24421", "vocab"], [5, "21332", "vocab"],
      ],
      [
        [1, "2144321313424", "grammar"], [2, "41233", "grammar"], [3, "21342", "grammar"],
        [4, "2314", "reading"], [5, "414314", "reading"], [6, "4223", "reading"], [7, "21", "reading"],
      ],
      [
        [1, "231343", "listening"], [2, "212423", "listening"], [3, "244", "listening"],
        [4, "2312", "listening"], [5, "132131223", "listening"],
      ]
    ),
  },
  {
    id: "n3-2019-07", level: "N3", year: 2019, month: 7, pages: 14, listeningPage: 13,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "12243134", "vocab"], [2, "341242", "vocab"], [3, "13121232434", "vocab"],
        [4, "34211", "vocab"], [5, "44231", "vocab"],
      ],
      [
        [1, "2441213243233", "grammar"], [2, "13322", "grammar"], [3, "42431", "grammar"],
        [4, "1423", "reading"], [5, "421332", "reading"], [6, "4213", "reading"], [7, "43", "reading"],
      ],
      [
        [1, "212222", "listening"], [2, "231313", "listening"], [3, "144", "listening"],
        [4, "2113", "listening"], [5, "232221311", "listening"],
      ]
    ),
  },
  {
    id: "n3-2018-12", level: "N3", year: 2018, month: 12, pages: 14, listeningPage: 13,
    disputed: { "0-3-18": 1 }, // key says 4 (減少) but 1 (乾燥) fits
    notes: [],
    parts: N3_PARTS(
      [
        [1, "24123134", "vocab"], [2, "331224", "vocab"], [3, "42243341314", "vocab"],
        [4, "14342", "vocab"], [5, "42213", "vocab"],
      ],
      [
        [1, "1443243121243", "grammar"], [2, "34142", "grammar"], [3, "11243", "grammar"],
        [4, "1224", "reading"], [5, "433213", "reading"], [6, "2443", "reading"], [7, "21", "reading"],
      ],
      [
        [1, "342431", "listening"], [2, "231342", "listening"], [3, "314", "listening"],
        [4, "1321", "listening"], [5, "213222113", "listening"],
      ]
    ),
  },
  {
    id: "n3-2018-07", level: "N3", year: 2018, month: 7, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "34122341", "vocab"], [2, "341324", "vocab"], [3, "41331214223", "vocab"],
        [4, "24231", "vocab"], [5, "13424", "vocab"],
      ],
      [
        [1, "4124233231412", "grammar"], [2, "14322", "grammar"], [3, "24143", "grammar"],
        [4, "3422", "reading"], [5, "422412", "reading"], [6, "1343", "reading"], [7, "11", "reading"],
      ],
      [
        [1, "134233", "listening"], [2, "323241", "listening"], [3, "242", "listening"],
        [4, "2123", "listening"], [5, "113213321", "listening"],
      ]
    ),
  },
  {
    id: "n3-2017-12", level: "N3", year: 2017, month: 12, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "34431421", "vocab"], [2, "434423", "vocab"], [3, "21221234213", "vocab"],
        [4, "34112", "vocab"], [5, "12343", "vocab"],
      ],
      [
        [1, "4213412312413", "grammar"], [2, "32241", "grammar"], [3, "31214", "grammar"],
        [4, "2344", "reading"], [5, "213331", "reading"], [6, "2431", "reading"], [7, "22", "reading"],
      ],
      [
        [1, "341213", "listening"], [2, "211341", "listening"], [3, "241", "listening"],
        [4, "2132", "listening"], [5, "331211212", "listening"],
      ]
    ),
  },
  {
    id: "n3-2017-07", level: "N3", year: 2017, month: 7, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "32234311", "vocab"], [2, "234214", "vocab"], [3, "42312142331", "vocab"],
        [4, "41314", "vocab"], [5, "34212", "vocab"],
      ],
      [
        [1, "1421323413422", "grammar"], [2, "21324", "grammar"], [3, "21343", "grammar"],
        [4, "2423", "reading"], [5, "443322", "reading"], [6, "1431", "reading"], [7, "31", "reading"],
      ],
      [
        [1, "232342", "listening"], [2, "242134", "listening"], [3, "423", "listening"],
        [4, "1221", "listening"], [5, "322323113", "listening"],
      ]
    ),
  },
  {
    id: "n3-2016-12", level: "N3", year: 2016, month: 12, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "42132431", "vocab"], [2, "433214", "vocab"], [3, "24131324412", "vocab"],
        [4, "41312", "vocab"], [5, "32213", "vocab"],
      ],
      [
        [1, "2431423231241", "grammar"], [2, "24213", "grammar"], [3, "34132", "grammar"],
        [4, "3241", "reading"], [5, "234341", "reading"], [6, "4413", "reading"], [7, "22", "reading"],
      ],
      [
        [1, "231212", "listening"], [2, "241134", "listening"], [3, "342", "listening"],
        [4, "1233", "listening"], [5, "132113212", "listening"],
      ]
    ),
  },
  {
    id: "n3-2016-07", level: "N3", year: 2016, month: 7, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "32443121", "vocab"], [2, "324132", "vocab"], [3, "34212414324", "vocab"],
        [4, "41321", "vocab"], [5, "31412", "vocab"],
      ],
      [
        [1, "3312242414314", "grammar"], [2, "13412", "grammar"], [3, "12143", "grammar"],
        [4, "3244", "reading"], [5, "342243", "reading"], [6, "1131", "reading"], [7, "12", "reading"],
      ],
      [
        [1, "313231", "listening"], [2, "234233", "listening"], [3, "244", "listening"],
        [4, "1132", "listening"], [5, "231223123", "listening"],
      ]
    ),
  },
  {
    id: "n3-2015-12", level: "N3", year: 2015, month: 12, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "41243241", "vocab"], [2, "241322", "vocab"], [3, "43314213243", "vocab"],
        [4, "42131", "vocab"], [5, "31422", "vocab"],
      ],
      [
        [1, "4213412241324", "grammar"], [2, "22314", "grammar"], [3, "14123", "grammar"],
        [4, "2332", "reading"], [5, "321442", "reading"], [6, "2311", "reading"], [7, "14", "reading"],
      ],
      [
        [1, "432331", "listening"], [2, "243231", "listening"], [3, "233", "listening"],
        [4, "2311", "listening"], [5, "311321232", "listening"],
      ]
    ),
  },
  {
    id: "n3-2014-12", level: "N3", year: 2014, month: 12, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "23323214", "vocab"], [2, "241212", "vocab"], [3, "22311442214", "vocab"],
        [4, "43143", "vocab"], [5, "23124", "vocab"],
      ],
      [
        [1, "2321142343421", "grammar"], [2, "12434", "grammar"], [3, "14232", "grammar"],
        [4, "3232", "reading"], [5, "334214", "reading"], [6, "2144", "reading"], [7, "11", "reading"],
      ],
      [
        [1, "231324", "listening"], [2, "341231", "listening"], [3, "422", "listening"],
        [4, "2123", "listening"], [5, "122331111", "listening"],
      ]
    ),
  },
  {
    id: "n3-2014-07", level: "N3", year: 2014, month: 7, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "22133142", "vocab"], [2, "341412", "vocab"], [3, "12132334344", "vocab"],
        [4, "43121", "vocab"], [5, "41423", "vocab"],
      ],
      [
        [1, "2313143212443", "grammar"], [2, "21234", "grammar"], [3, "14342", "grammar"],
        [4, "2112", "reading"], [5, "213143", "reading"], [6, "2341", "reading"], [7, "34", "reading"],
      ],
      [
        [1, "234221", "listening"], [2, "423432", "listening"], [3, "142", "listening"],
        [4, "3312", "listening"], [5, "211121323", "listening"],
      ]
    ),
  },
  {
    id: "n3-2013-12", level: "N3", year: 2013, month: 12, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "14213413", "vocab"], [2, "234141", "vocab"], [3, "23412432113", "vocab"],
        [4, "22143", "vocab"], [5, "32431", "vocab"],
      ],
      [
        [1, "4223134142231", "grammar"], [2, "11243", "grammar"], [3, "32134", "grammar"],
        [4, "3142", "reading"], [5, "231324", "reading"], [6, "3113", "reading"], [7, "42", "reading"],
      ],
      [
        [1, "241422", "listening"], [2, "234321", "listening"], [3, "223", "listening"],
        [4, "1321", "listening"], [5, "112313332", "listening"],
      ]
    ),
  },
  {
    id: "n3-2013-07", level: "N3", year: 2013, month: 7, pages: 13, listeningPage: 12,
    notes: [],
    parts: N3_PARTS(
      [
        [1, "34112132", "vocab"], [2, "232144", "vocab"], [3, "43231441243", "vocab"],
        [4, "12442", "vocab"], [5, "33123", "vocab"],
      ],
      [
        [1, "3324112323144", "grammar"], [2, "41232", "grammar"], [3, "13244", "grammar"],
        [4, "2442", "reading"], [5, "213142", "reading"], [6, "1323", "reading"], [7, "11", "reading"],
      ],
      [
        [1, "324334", "listening"], [2, "322343", "listening"], [3, "123", "listening"],
        [4, "3131", "listening"], [5, "323231132", "listening"],
      ]
    ),
  },
];
